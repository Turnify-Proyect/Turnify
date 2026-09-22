import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/common/userRoles.enum';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { AuthProvider } from '../common/authProvider.enum';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { CloudinaryService } from '../config/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    const cloudinaryResult = await this.cloudinaryService.uploadImage(
      file,
      'turnify/users',
    );
    return this.usersRepository.updateProfilePicture(
      userId,
      cloudinaryResult.secure_url,
    );
  }

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

  //metodo exclusivo del admin para crear usuarios
  async createUserByAdmin(createUserDto: CreateUserByAdminDto) {
    const { email, phone, password, confirmPassword, roles, ...userData } =
      createUserDto;

    const foundUser = await this.usersRepository.getUserByEmail(email);

    if (foundUser) {
      throw new ConflictException('El email ya esta registrado');
    }

    const foundPhone = await this.usersRepository.getUserByPhone(phone);

    if (foundPhone) {
      throw new ConflictException('El telefono ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.usersRepository.createUser({
      ...userData,
      email,
      phone,
      password_hash: hashedPassword,
      roles,
      authProvider: AuthProvider.LOCAL,
      providerId: null,
    });
  }

  async updateUserRoles(id: string, updateUserRolesDto: UpdateUserRolesDto) {
    const roles = [...new Set(updateUserRolesDto.roles)];

    const currentUser = await this.usersRepository.getUserById(id);

    const hasClient = roles.includes(UserRole.CLIENT);

    const hasProfessional = roles.includes(UserRole.PROFESSIONAL);

    const currentlyProfessional = currentUser.roles.includes(
      UserRole.PROFESSIONAL,
    );

    if (hasClient && hasProfessional) {
      throw new BadRequestException(
        'Un usuario no puede ser cliente y profesional al mismo tiempo',
      );
    }

    if (hasProfessional && !currentlyProfessional) {
      throw new BadRequestException(
        'Para asignar el rol profesional se debe crear el perfil profesional',
      );
    }

    if (currentlyProfessional && !hasProfessional) {
      throw new BadRequestException(
        'El rol profesional no puede quitarse desde la gestión de usuarios',
      );
    }

    return this.usersRepository.updateUserRoles(id, roles);
  }
}
