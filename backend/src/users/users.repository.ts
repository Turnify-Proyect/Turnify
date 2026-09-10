import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly ormUsersRepository: Repository<User>,
  ) {}

  async getAllUsers(
    page: number,
    limit: number,
  ): Promise<Omit<User, 'password_hash'>[]> {
    const skip = (page - 1) * limit;
    const allUsers = await this.ormUsersRepository.find({
      skip: skip,
      take: limit,
    });
    return allUsers.map(
      ({ password_hash, ...userNoPassword_hash }) => userNoPassword_hash,
    );
  }

  async getUserById(id: string): Promise<Omit<User, 'password_hash' | 'role'>> {
    const foundUser = await this.ormUsersRepository.findOne({
      where: { id },
    });

    if (!foundUser)
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    const { password_hash, role, ...filteredUser } = foundUser;
    return filteredUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.ormUsersRepository.findOneBy({ email });
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password_hash' | 'role'>> {
    const newUser = this.ormUsersRepository.create(createUserDto);
    await this.ormUsersRepository.save(newUser);
    const { password_hash, role, ...filteredUser } = newUser;
    return filteredUser;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password_hash' | 'role'>> {
    const userToUpdate = await this.ormUsersRepository.findOneBy({ id });

    if (!userToUpdate) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    const updatedUser = Object.assign(userToUpdate, updateUserDto);
    await this.ormUsersRepository.save(updatedUser);
    const { password_hash, role, ...filteredUser } = updatedUser;
    return filteredUser;
  }

  async removeUser(id: string): Promise<string> {
    const userToRemove = await this.ormUsersRepository.findOneBy({ id });
    if (!userToRemove) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }
    await this.ormUsersRepository.remove(userToRemove);
    return `Usuario con id ${id} eliminado correctamente`;
  }
}
