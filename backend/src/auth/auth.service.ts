import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
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
    //payload.roles tiene que contener un [foundUser.role] ya que eso espera roles.guard, pensando en escalabilidad
    //coemntado por:Lautaro-dev
    //cambié la identacion "Roles" por "roles"
    //coemntado por:Lautaro-dev
    //Cambié error de tipeo 'messege' a 'message'
    //coemntado por:Lautaro-dev
    const payload = {
      id: foundUser.id,
      roles: [foundUser.role],
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

    return this.usersRepository.createUser({
      ...userData,
      email,
      phone,

      //aqui es renombrada como "password_hash"
      // comentado por: Lautaro-dev
      password_hash: hashedPassword,
    });
  }
}
