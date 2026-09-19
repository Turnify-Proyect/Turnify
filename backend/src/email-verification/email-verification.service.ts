import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EmailVerificationService {
  constructor(
    // Inyecta el repositorio normal de EmailVerificationToken.
    // Este repositorio se utiliza para crear y guardar tokens fuera de una transacción.
    // comentado por: Lautaro-dev
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,

    // DataSource representa la conexión principal que TypeORM mantiene
    // con la base de datos.
    // Además de permitir acceder a repositorios, permite iniciar transacciones.
    // En verifyEmail() lo utilizamos para asegurarnos de que:
    // 1) el usuario quede verificado
    // 2) el token quede marcado como usado
    // ocurran como una única operación.
    // comentado por: Lautaro-dev
    private readonly dataSource: DataSource,
  ) {}

  // Recibe un token original y genera siempre su hash SHA-256.
  //
  // Ejemplo:
  // token original -> "abc123..."
  // SHA-256        -> "9f86d081..."
  //
  // El token original será el que reciba el usuario por email,
  // mientras que en la base de datos almacenamos solamente su hash.
  //
  // Este método es privado porque solo se utiliza internamente
  // dentro de EmailVerificationService.
  // comentado por: Lautaro-dev
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Comprueba que un token encontrado en la base de datos
  // todavía pueda utilizarse.
  //
  // Este método NO busca el token en la DB.
  // Recibe un EmailVerificationToken que ya fue encontrado
  // y solamente aplica las reglas de validación.
  // comentado por: Lautaro-dev
  private validateVerificationToken(
    verificationToken: EmailVerificationToken,
  ): void {
    // usedAt comienza siendo null.
    // Si contiene una fecha significa que el token ya fue utilizado,
    // por lo tanto no permitimos que vuelva a utilizarse.
    // comentado por: Lautaro-dev
    if (verificationToken.usedAt) {
      throw new BadRequestException(
        'El token de verificación ya fue utilizado',
      );
    }

    // Compara la fecha de vencimiento del token con el momento actual.
    //
    // Ejemplo:
    // expiresAt = 20:00
    // ahora     = 20:30
    //
    // 20:00 < 20:30 -> el token ya expiró.
    // comentado por: Lautaro-dev
    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('El token de verificación ha expirado');
    }
  }

  // Crea un nuevo token temporal de verificación para un usuario.
  //
  // Recibe solamente el userId porque para relacionar el token
  // con el usuario TypeORM únicamente necesita conocer su PK.
  //
  // Devuelve el token ORIGINAL para que posteriormente
  // pueda enviarse al usuario por email.
  // comentado por: Lautaro-dev
  async createVerificationToken(userId: string): Promise<string> {
    // Genera 32 bytes criptográficamente aleatorios.
    // Luego los convierte a hexadecimal.
    //
    // 32 bytes -> 64 caracteres hexadecimales.
    //
    // Este es el token ORIGINAL que recibirá el usuario.
    // comentado por: Lautaro-dev
    const token = randomBytes(32).toString('hex');

    // Genera el SHA-256 del token original.
    // Este es el valor que vamos a almacenar en la base de datos.
    // comentado por: Lautaro-dev
    const tokenHash = this.hashToken(token);

    // Obtiene la fecha/hora actual.
    // comentado por: Lautaro-dev
    const expiresAt = new Date();

    // Modifica esa fecha agregándole 30 minutos.
    // Por lo tanto, el token será válido durante 30 minutos.
    // comentado por: Lautaro-dev
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Crea una instancia de EmailVerificationToken EN MEMORIA.
    // create() todavía no realiza ningún INSERT en PostgreSQL.
    //
    // Le pasamos:
    // - tokenHash: hash que queremos almacenar.
    // - expiresAt: fecha de vencimiento.
    // - user: relación con el usuario.
    //
    // Aunque pasamos:
    //
    // user: { id: userId }
    //
    // en EMAIL_VERIFICATION_TOKENS no se guarda un objeto User.
    // TypeORM reconoce la relación y persiste únicamente:
    //
    // user_id = userId
    //
    // comentado por: Lautaro-dev
    const verificationToken = this.emailVerificationTokenRepository.create({
      tokenHash,
      expiresAt,
      user: {
        id: userId,
      },
    });

    // save() realiza el INSERT real en la base de datos.
    //
    // TypeORM completa automáticamente:
    // - verification_id
    // - created_at
    //
    // used_at permanece en NULL porque el token todavía no fue utilizado.
    // comentado por: Lautaro-dev
    await this.emailVerificationTokenRepository.save(verificationToken);

    // Devuelve el token ORIGINAL, no el hash.
    //
    // Más adelante este valor será enviado por email.
    // La base de datos conserva solamente su SHA-256.
    // comentado por: Lautaro-dev
    return token;
  }

  // Recibe el token original que devuelve el usuario
  // después de abrir el enlace de verificación.
  //
  // Si el token es válido:
  // - marca al usuario como email verificado
  // - marca el token como utilizado
  //
  // Ambas operaciones se ejecutan dentro de una transacción.
  // comentado por: Lautaro-dev
  async verifyEmail(token: string): Promise<void> {
    // El usuario devuelve el token ORIGINAL.
    //
    // Como en la base de datos almacenamos solamente su hash,
    // debemos calcular nuevamente SHA-256 para poder buscarlo.
    // comentado por: Lautaro-dev
    const tokenHash = this.hashToken(token);

    // Inicia una transacción de TypeORM.
    //
    // TypeORM nos entrega automáticamente "manager".
    // Nosotros NO creamos ese manager.
    //
    // manager es un EntityManager asociado específicamente
    // a esta transacción.
    //
    // Todas las operaciones realizadas utilizando repositorios
    // obtenidos desde este manager forman parte de la misma transacción.
    //
    // Si todo funciona:
    // COMMIT
    //
    // Si alguna operación lanza una excepción:
    // ROLLBACK
    //
    // comentado por: Lautaro-dev
    await this.dataSource.transaction(async (manager) => {
      // Obtiene un Repository<EmailVerificationToken>
      // asociado a ESTA transacción.
      //
      // No usamos aquí this.emailVerificationTokenRepository
      // porque queremos que las operaciones realizadas sobre el token
      // formen parte de la misma transacción.
      // comentado por: Lautaro-dev
      const verificationTokenRepository = manager.getRepository(
        EmailVerificationToken,
      );

      // Obtiene un Repository<User> asociado también
      // a la misma transacción.
      //
      // De esta forma, tanto la modificación de USERS como
      // la modificación de EMAIL_VERIFICATION_TOKENS
      // pertenecen a una única operación atómica.
      // comentado por: Lautaro-dev
      const usersRepository = manager.getRepository(User);

      // Busca en EMAIL_VERIFICATION_TOKENS el registro cuyo
      // token_hash coincida con el hash que acabamos de calcular.
      //
      // relations: { user: true }
      // indica a TypeORM que además cargue el User relacionado.
      //
      // Sin esa relación cargada tendríamos el token,
      // pero no necesariamente el objeto verificationToken.user.
      // comentado por: Lautaro-dev
      const verificationToken = await verificationTokenRepository.findOne({
        where: { tokenHash },
        relations: {
          user: true,
        },
      });

      // Si no encontramos un registro con ese hash,
      // el token recibido no corresponde a ningún token válido
      // almacenado por nuestro sistema.
      // comentado por: Lautaro-dev
      if (!verificationToken) {
        throw new BadRequestException('Token de verificación inválido');
      }

      // Comprueba:
      // - que el token no haya sido utilizado
      // - que el token no haya expirado
      //
      // Si alguna validación falla, lanza una excepción
      // y la transacción se revierte.
      // comentado por: Lautaro-dev
      this.validateVerificationToken(verificationToken);

      // El token contiene la relación con el usuario porque
      // anteriormente pedimos relations: { user: true }.
      //
      // Cambiamos el objeto User en memoria:
      //
      // false -> true
      //
      // todavía no se ha guardado en PostgreSQL.
      // comentado por: Lautaro-dev
      verificationToken.user.isEmailVerified = true;

      // Guarda la modificación del usuario utilizando
      // el repositorio perteneciente a la transacción.
      //
      // USERS.is_email_verified pasa a true.
      // comentado por: Lautaro-dev
      await usersRepository.save(verificationToken.user);

      // Marcamos el token como utilizado colocando la fecha actual.
      //
      // Antes:
      // used_at = NULL
      //
      // Después:
      // used_at = fecha/hora actual
      //
      // Esto impide reutilizar posteriormente el mismo token.
      // comentado por: Lautaro-dev
      verificationToken.usedAt = new Date();

      // Guarda la modificación del token utilizando también
      // el repositorio perteneciente a la misma transacción.
      // comentado por: Lautaro-dev
      await verificationTokenRepository.save(verificationToken);

      // Si llegamos hasta acá sin excepciones,
      // TypeORM hace COMMIT automáticamente.
      //
      // Si alguno de los save anteriores hubiera fallado,
      // TypeORM haría ROLLBACK y ninguno de los dos cambios
      // quedaría persistido.
      // comentado por: Lautaro-dev
    });
  }
}
