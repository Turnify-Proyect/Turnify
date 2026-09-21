import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider } from '../common/authProvider.enum';
import { EmailVerificationService } from '../email-verification/email-verification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  getAuth(): string {
    return 'Auth';
  }

  async signIn(email: string, password: string) {
    const foundUser = await this.usersRepository.getUserByEmail(email);

    //agregué !foundUser.password_hash para que cuando se incorpore el registro externo no compare con null en la base de datos
    //coemntado por:Lautaro-dev
    //cambio de ForbiddenException implementacion de error a UnauthorizedException
    //coemntado por:Lautaro-dev
    if (!foundUser || !foundUser.password_hash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const validPassword_hash = await bcrypt.compare(
      password,
      foundUser.password_hash,
    );
    //cambio de ForbiddenException implementacion de error a UnauthorizedException
    //coemntado por:Lautaro-dev
    if (!validPassword_hash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Aunque las credenciales sean correctas, los usuarios registrados
    // localmente deben confirmar su correo antes de poder iniciar sesión.
    // comentado por: Lautaro-dev
    if (!foundUser.isEmailVerified) {
      throw new ForbiddenException(
        'Debes verificar tu correo electrónico antes de iniciar sesión',
      );
    }

    //payload.roles tiene que contener un [foundUser.role] ya que eso espera roles.guard, pensando en escalabilidad
    //coemntado por:Lautaro-dev
    //cambié la identacion "Roles" por "roles"
    //coemntado por:Lautaro-dev
    //Cambié error de tipeo 'messege' a 'message'
    //coemntado por:Lautaro-dev
    const payload = {
      id: foundUser.id,
      roles: foundUser.roles,
    };
    const token = this.jwtService.sign(payload);
    return {
      message: 'Usuario logueado',
      token,
    };
  }
  // desestructure confirmPassword para quitarlo de la informacion que llega a users.repository.createUser()
  // "passwor_hash" fue cambiada por "password" en toda la ruta anterior a ser hasheada
  //coemntado por:Lautaro-dev
  async signUp(newUserData: CreateUserDto) {
    // extraje password y confirmPassword porque son datos recibidos desde el cliente, pero no deben guardarse directamente en la entidad.
    // También se extraen email y phone para comprobar que sean unicos antes de crear el usuario.
    // comentado por: Lautaro-dev
    const { email, phone, password, confirmPassword, ...userData } =
      newUserData;

    const foundUser = await this.usersRepository.getUserByEmail(email);

    // Cambio de ForbiddenException a ConflictException porque intentar
    // registrar un email que ya existe representa un conflicto con un recurso existente.
    // comentado por: Lautaro-dev
    if (foundUser) {
      throw new ConflictException('El email ya esta registrado');
    }

    // Verifica si ya existe un usuario registrado con el mismo número de teléfono.
    // Esta validación se realiza antes de guardar para evitar que la restricción
    // UNIQUE de PostgreSQL genere un error 500.
    // comentado por: Lautaro-dev
    const foundPhone = await this.usersRepository.getUserByPhone(phone);

    if (foundPhone) {
      throw new ConflictException('El telefono ya esta registrado');
    }

    // La contraseña recibida en texto plano se hashea antes de persistirla.
    // De esta forma nunca se guarda directamente la contraseña original del usuario.
    // comentado por: Lautaro-dev
    const hashedPassword = await bcrypt.hash(password, 10);

    // El usuario debe crearse primero porque necesitamos su id para asociar
    // el token de verificación mediante la FK user_id.
    // comentado por: Lautaro-dev
    const createdUser = await this.usersRepository.createUser({
      ...userData,
      email,
      phone,
      password_hash: hashedPassword,

      // El proveedor de autenticación lo determina el backend según
      // el flujo utilizado. Como este método corresponde al registro
      // tradicional con email y contraseña, el proveedor siempre es LOCAL.
      // comentado por: Lautaro-dev
      authProvider: AuthProvider.LOCAL,

      // Los usuarios locales no tienen un identificador perteneciente
      // a un proveedor externo como Google o Facebook.
      // comentado por: Lautaro-dev
      providerId: null,
    });

    // Genera un token temporal de verificación asociado al usuario recién creado.
    // El método guarda únicamente el hash en la DB y devuelve el token original.
    // comentado por: Lautaro-dev
    const verificationToken =
      await this.emailVerificationService.createVerificationToken(
        createdUser.id,
      );

    // TEMPORAL:
    // El token original se devuelve únicamente mientras desarrollamos y probamos
    // el flujo de verificación. Cuando Nodemailer esté implementado,
    // este token se enviará por correo y dejará de exponerse en la respuesta.
    // comentado por: Lautaro-de
    return {
      user: createdUser,
      verificationToken,
    };
  }

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async googleSignIn(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    // Google informa mediante email_verified si ya comprobó que el usuario
    // tiene acceso al correo asociado a la cuenta.
    // Solo permitimos continuar con la autenticación si Google lo confirmó.
    // comentado por: Lautaro-dev
    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'El correo asociado a la cuenta de Google no está verificado',
      );
    }

    const foundUser = await this.usersRepository.getUserByEmail(payload.email);

    // Si el usuario ya existe, lo logueamos directo
    if (foundUser) {
      // Si ya existe una cuenta con ese email pero fue creada mediante
      // autenticación local, no se vincula automáticamente con Google.
      // La vinculación de proveedores debe ser un proceso explícito.
      // comentado por: Lautaro-dev
      if (foundUser.authProvider !== AuthProvider.GOOGLE) {
        throw new ConflictException(
          'Este email ya está registrado mediante autenticación local',
        );
      }

      // Para una cuenta Google existente, verificamos además que el
      // identificador de Google coincida con el almacenado originalmente.
      // comentado por: Lautaro-dev
      if (foundUser.providerId !== payload.sub) {
        throw new UnauthorizedException(
          'La cuenta de Google no coincide con el usuario registrado',
        );
      }

      const jwtPayload = {
        id: foundUser.id,
        roles: foundUser.roles,
      };

      const token = this.jwtService.sign(jwtPayload);

      return {
        message: 'Usuario logueado con Google',
        token,
      };
    }

    // Si es un usuario nuevo, todavía no lo creamos: falta el teléfono.
    // Generamos un token temporal de registro con los datos de Google adentro.
    const registrationToken = this.jwtService.sign(
      {
        email: payload.email,
        name: payload.name,
        providerId: payload.sub,
        type: 'google_registration',
      },
      { expiresIn: '15m' },
    );

    return { needsPhone: true, registrationToken };
  }

  async googleCompleteSignUp(
    registrationToken: string,
    phone: string,
    country?: string,
    address?: string,
    city?: string,
  ) {
    let decoded: any;

    try {
      decoded = this.jwtService.verify(registrationToken);
    } catch {
      throw new UnauthorizedException('El registro expiró, intentá de nuevo.');
    }

    if (decoded.type !== 'google_registration') {
      throw new UnauthorizedException('Token de registro inválido');
    }

    const foundUser = await this.usersRepository.getUserByEmail(decoded.email);
    if (foundUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const foundPhone = await this.usersRepository.getUserByPhone(phone);
    if (foundPhone) {
      throw new ConflictException('El teléfono ya está registrado');
    }

    await this.usersRepository.createUser({
      name: decoded.name || decoded.email,
      email: decoded.email,
      phone,
      country: country || undefined,
      address: address || undefined,
      city: city || undefined,

      // Los usuarios autenticados mediante Google no utilizan
      // una contraseña local dentro de Turnify.
      // comentado por: Lautaro-dev
      password_hash: null,

      // Este flujo corresponde específicamente al registro mediante Google,
      // por lo tanto el proveedor lo determina el backend.
      // comentado por: Lautaro-dev
      authProvider: AuthProvider.GOOGLE,

      providerId: decoded.providerId,

      // El correo ya fue validado mediante el flujo de autenticación de Google,
      // por lo que no necesita pasar por la verificación de email de Turnify.
      // comentado por: Lautaro-dev
      isEmailVerified: true,
    });

    const createdUser = await this.usersRepository.getUserByEmail(
      decoded.email,
    );

    if (!createdUser) {
      throw new UnauthorizedException('Error al crear el usuario');
    }

    const jwtPayload = { id: createdUser.id, roles: createdUser.roles };
    const token = this.jwtService.sign(jwtPayload);
    return { message: 'Usuario registrado con Google', token };
  }
}
