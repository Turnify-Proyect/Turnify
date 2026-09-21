import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserData } from './types/create-user-data.type';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from 'src/common/userRoles.enum';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly ormUsersRepository: Repository<User>,
  ) {}

  //async getAllUsers(
  //  page: number,
  //  limit: number,
  //): Promise<Omit<User, 'password_hash'>[]> {
  //  const skip = (page - 1) * limit;
  //  const allUsers = await this.ormUsersRepository.find({
  //    skip: skip,
  //    take: limit,
  //  });
  //  return allUsers.map(
  //    ({ password_hash, ...userNoPassword_hash }) => userNoPassword_hash,
  //  );
  //}

  async getAllUsers(
    page: number,
    limit: number,
    search?: string,
    role?: UserRole,
    isActive?: boolean,
  ): Promise<{
    users: Omit<User, 'password_hash'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const query = this.ormUsersRepository
      .createQueryBuilder('user')
      .skip(skip)
      .take(limit)
      .orderBy('user.name', 'ASC');

    if (search) {
      query.andWhere(
        '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        {
          search: `%${search}%`,
        },
      );
    }

    if (role) {
      query.andWhere(':role = ANY(user.roles)', {
        role,
      });
    }

    if (isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', {
        isActive,
      });
    }

    const [users, total] = await query.getManyAndCount();

    const usersWithoutPassword = users.map(
      ({ password_hash, ...user }) => user,
    );

    return {
      users: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  //async getUserById(id: string): Promise<Omit<User, 'password_hash' | 'role'>> {
  //  const foundUser = await this.ormUsersRepository.findOne({
  //    where: { id },
  //  });
  //
  //  if (!foundUser)
  //    throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
  //  const { password_hash, role, ...filteredUser } = foundUser;
  //  return filteredUser;
  //}

  async getUserById(id: string): Promise<Omit<User, 'password_hash'>> {
    const foundUser = await this.ormUsersRepository.findOne({
      where: { id },
    });

    if (!foundUser) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    const { password_hash, ...filteredUser } = foundUser;

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

  // Ahora recibe los datos internos ya procesados por el backend para crear un usuario.
  // No utiliza CreateUserDto porque ese DTO representa los datos permitidos
  // desde una petición HTTP, mientras que CreateUserData también puede contener
  // información interna como authProvider, providerId y password_hash.
  // comentado por: Lautaro-dev
  async createUser(
    createUserData: CreateUserData,
  ): Promise<Omit<User, 'password_hash'>> {
    const newUser = this.ormUsersRepository.create(createUserData);

    await this.ormUsersRepository.save(newUser);

    const { password_hash, ...filteredUser } = newUser;

    return filteredUser;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password_hash'>> {
    const userToUpdate = await this.ormUsersRepository.findOneBy({ id });

    if (!userToUpdate) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    if (updateUserDto.email) {
      const userWithEmail = await this.ormUsersRepository.findOneBy({
        email: updateUserDto.email,
      });

      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('El email ya esta registrado');
      }
    }

    if (updateUserDto.phone) {
      const userWithPhone = await this.ormUsersRepository.findOneBy({
        phone: updateUserDto.phone,
      });

      if (userWithPhone && userWithPhone.id !== id) {
        throw new ConflictException('El telefono ya esta registrado');
      }
    }

    const updatedUser = Object.assign(userToUpdate, updateUserDto);

    await this.ormUsersRepository.save(updatedUser);

    const { password_hash, ...filteredUser } = updatedUser;

    return filteredUser;
  }

  // Función para actualizar la contraseña encriptada del usuario en la base de datos.
  // Recibe la contraseña ya cifrada con bcrypt
  // comentado por: Jose-dev
  async updatePassword(id: string, hashedPassword: string): Promise<string> {
    const userToUpdate = await this.ormUsersRepository.findOneBy({ id });

    if (!userToUpdate) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    userToUpdate.password_hash = hashedPassword;
    await this.ormUsersRepository.save(userToUpdate);

    return 'Contraseña actualizada correctamente';
  }

  //async removeUser(id: string): Promise<string> {
  //  const userToRemove = await this.ormUsersRepository.findOneBy({ id });
  //  if (!userToRemove) {
  //    throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
  //  }
  //  await this.ormUsersRepository.remove(userToRemove);
  //  return `Usuario con id ${id} eliminado correctamente`;
  //}

  async removeUser(id: string): Promise<{ message: string }> {
    const userToRemove = await this.ormUsersRepository.findOneBy({ id });

    if (!userToRemove) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    if (!userToRemove.isActive) {
      throw new ConflictException('El usuario ya se encuentra inactivo');
    }

    userToRemove.isActive = false;

    await this.ormUsersRepository.save(userToRemove);

    return {
      message: 'Usuario desactivado correctamente',
    };
  }

  async activateUser(id: string): Promise<{ message: string }> {
    const userToActivate = await this.ormUsersRepository.findOneBy({ id });

    if (!userToActivate) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    if (userToActivate.isActive) {
      throw new ConflictException('El usuario ya se encuentra activo');
    }

    userToActivate.isActive = true;

    await this.ormUsersRepository.save(userToActivate);

    return {
      message: 'Usuario activado correctamente',
    };
  }

  //ADMIN: modificar rol de usuario existente

  async updateUserRoles(
    id: string,
    roles: UserRole[],
  ): Promise<Omit<User, 'password_hash'>> {
    const user = await this.ormUsersRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`No se encontro el usuario con el id ${id}`);
    }

    user.roles = roles;

    const updatedUser = await this.ormUsersRepository.save(user);

    const { password_hash, ...filteredUser } = updatedUser;

    return filteredUser;
  }
}
