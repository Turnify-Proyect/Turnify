import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/common/userRoles.enum';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  //getAllUsers(validPage: number, validLimit: number) {
  //  return this.usersRepository.getAllUsers(validPage, validLimit);
  //}

  getAllUsers(
    page: number,
    limit: number,
    search?: string,
    role?: UserRole,
    isActive?: boolean,
  ) {
    return this.usersRepository.getAllUsers(
      page,
      limit,
      search,
      role,
      isActive,
    );
  }

  getUserById(id: string) {
    return this.usersRepository.getUserById(id);
  }

  //user.service.createUser desactivado, sin uso
  // createUser(createUserDto: CreateUserDto) {
  //   return this.usersRepository.createUser(createUserDto);
  // }
  //coemntado por:Lautaro-dev

  updateUser(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.updateUser(id, updateUserDto);
  }

  // Encripta la nueva contraseña utilizando bcrypt

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<string> {
    const hashedPassword = await bcrypt.hash(changePasswordDto.password, 10);
    return this.usersRepository.updatePassword(id, hashedPassword);
  }

  removeUser(id: string) {
    return this.usersRepository.removeUser(id);
  }

  activateUser(id: string) {
  return this.usersRepository.activateUser(id);
}
}
