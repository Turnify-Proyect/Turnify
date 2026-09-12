import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  //agregue la funcion edbuscar un usuari por su telefono para poder utilizarla en AuthService.signUp
  async getUserByPhone(phone: string): Promise<User | null> {
    return this.ormUsersRepository.findOneBy({ phone });
  }
  //está funcion la cree, sirve, pero la cambié por una mas limpia, ya que por un minimo momento hay una constante password que en realiad es una password_hash
  // async createUser(
  //   createUserDto: Omit<CreateUserDto, 'confirmPassword'>,
  // ): Promise<Omit<User, 'password_hash' | 'role'>> {
  //   const { password: password_hash, ...users } = createUserDto;
  //   const user = { ...users, password_hash };
  //   const newUser = this.ormUsersRepository.create(user);
  //   await this.ormUsersRepository.save(newUser);
  //   const { password_hash: _, role, ...filteredUser } = newUser;
  //   return filteredUser;
  // }

  // Omiti 'confirmPassword' del CreateUserDto ya que no tiene que llegar al repositorio como informacion
  //coemntado por:Lautaro-dev
  async createUser(
    createUserDto: Omit<CreateUserDto, 'password' | 'confirmPassword'> & {
      password_hash: string;
    },
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

    // Si se intenta modificar el email, verifica que no pertenezca
    // a otro usuario antes de actualizar para evitar un error UNIQUE de la DB.
    //coemntado por:Lautaro-dev
    if (updateUserDto.email) {
      const userWithEmail = await this.ormUsersRepository.findOneBy({
        email: updateUserDto.email,
      });

      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('El email ya esta registrado');
      }
    }

    // Si se intenta modificar el teléfono, verifica que no pertenezca
    // a otro usuario antes de actualizar.
    // Esto evita que PostgreSQL lance un error UNIQUE y termine en un 500.
    // comentado por: Lautaro-dev
    if (updateUserDto.phone) {
      const userWithPhone = await this.ormUsersRepository.findOneBy({
        phone: updateUserDto.phone,
      });

      // Si el teléfono encontrado pertenece al mismo usuario,
      // se permite conservarlo.
      // Solo se considera conflicto si pertenece a otro usuario.
      // comentado por: Lautaro-dev
      if (userWithPhone && userWithPhone.id !== id) {
        throw new ConflictException('El telefono ya esta registrado');
      }
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
