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
import { EmailVerificationService } from '../auth/email-verification/email-verification.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mailService: MailService,
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

  updateUser(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.updateUser(id, updateUserDto);
  }

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

    const createdUser = await this.usersRepository.createUser({
      ...userData,
      email,
      phone,
      password_hash: hashedPassword,
      roles,
      authProvider: AuthProvider.LOCAL,
      providerId: null,
      isEmailVerified: false,
    });

    try {
      const verificationToken =
        await this.emailVerificationService.createVerificationToken(
          createdUser.id,
        );

      await this.mailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      // La cuenta ya fue creada; un fallo de correo no debe hacer creer
      // al administrador que la creación falló y provocar un duplicado.
      console.warn(
        'No se pudo enviar el correo de verificación al usuario creado por administración:',
        error instanceof Error ? error.message : String(error),
      );
    }

    return createdUser;
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
