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
import { EmailVerificationService } from './email-verification/email-verification.service';
import { MailService } from 'src/mail/mail.service';
import { PasswordResetService } from './password-reset/password-reset.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mailService: MailService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  getAuth(): string {
    return 'Auth';
  }

  async signIn(email: string, password: string) {
    const foundUser = await this.usersRepository.getUserByEmail(email);

    if (!foundUser || !foundUser.password_hash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const validPassword_hash = await bcrypt.compare(
      password,
      foundUser.password_hash,
    );

    if (!validPassword_hash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!foundUser.isEmailVerified) {
      throw new ForbiddenException(
        'Debes verificar tu correo electrónico antes de iniciar sesión',
      );
    }

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

  async signUp(newUserData: CreateUserDto) {
    const { email, phone, password, confirmPassword, ...userData } =
      newUserData;

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

      authProvider: AuthProvider.LOCAL,

      providerId: null,

      isEmailVerified: true,
    });

    try {
      const verificationToken =
        await this.emailVerificationService.createVerificationToken(
          createdUser.id,
        );

      await this.mailService.sendVerificationEmail(email, verificationToken);
    } catch (mailError: any) {
      console.warn(
        'Aviso dev local: No se pudo enviar email de verificación (SMTP no configurado):',
        mailError?.message || mailError,
      );
    }

    return {
      message: 'Usuario registrado correctamente. Ya podés iniciar sesión.',
      user: createdUser,
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

    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'El correo asociado a la cuenta de Google no está verificado',
      );
    }

    const foundUser = await this.usersRepository.getUserByEmail(payload.email);

    if (foundUser) {
      if (foundUser.authProvider !== AuthProvider.GOOGLE) {
        throw new ConflictException(
          'Este email ya está registrado mediante autenticación local',
        );
      }

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

      password_hash: null,

      authProvider: AuthProvider.GOOGLE,

      providerId: decoded.providerId,

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

  async verifyEmail(token: string): Promise<void> {
    await this.emailVerificationService.verifyEmail(token);
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await this.usersRepository.getUserByEmail(email);

    if (!user) {
      return 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña';
    }

    if (!user.password_hash) {
      return 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña';
    }

    const token = await this.passwordResetService.createPasswordResetToken(
      user.id,
    );

    await this.mailService.sendPasswordResetEmail(user.email, token);

    return 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña';
  }

  async resetPassword(token: string, newPassword: string): Promise<string> {
    return this.passwordResetService.resetPassword(token, newPassword);
  }
}
