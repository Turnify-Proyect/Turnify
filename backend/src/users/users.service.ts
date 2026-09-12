import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  getAllUsers(validPage: number, validLimit: number) {
    return this.usersRepository.getAllUsers(validPage, validLimit);
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

  removeUser(id: string) {
    return this.usersRepository.removeUser(id);
  }
}
