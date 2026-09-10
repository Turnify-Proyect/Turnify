import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsersRepository } from 'src/users/users.repository';
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

  async signIn(email: string, password_hash: string) {
    const foundUser = await this.usersRepository.getUserByEmail(email);
    console.log('Usuario encontrado:', foundUser);
    console.log('Is Role:', foundUser?.role);

    if (!foundUser) {
      throw new ForbiddenException('Credenciales incorrectas');
    }

    const validPassword_hash = await bcrypt.compare(
      password_hash,
      foundUser.password_hash,
    );
    if (!validPassword_hash) {
      throw new ForbiddenException('Credenciales incorrectas');
    }
    const payload = {
      id: foundUser.id,
      Roles: foundUser.role,
    };
    const token = this.jwtService.sign(payload);
    return {
      messege: 'Usuario logueado',
      token,
    };
  }

  async signUp(newUserData: CreateUserDto) {
    const { email, password_hash } = newUserData;

    const foundUser = await this.usersRepository.getUserByEmail(email);
    if (foundUser) {
      throw new ForbiddenException('El email ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);
    return await this.usersRepository.createUser({
      ...newUserData,
      password_hash: hashedPassword,
    });
  }
}
