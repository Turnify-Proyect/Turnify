import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';


import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { JwtService } from '@nestjs/jwt';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { MailService } from 'src/mail/mail.service';
import { PasswordResetService } from './password-reset/password-reset.service';
import { AuthProvider } from '../common/authProvider.enum';

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;

  let usersRepository: {
    getUserByEmail: jest.Mock;
    getUserByPhone: jest.Mock;
    createUser: jest.Mock;
  };

  let jwtService: {
    sign: jest.Mock;
    verify: jest.Mock;
  };

  let emailVerificationService: {
    createVerificationToken: jest.Mock;
    verifyEmail: jest.Mock;
  };

  let mailService: {
    sendVerificationEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
  };

  let passwordResetService: {
    createPasswordResetToken: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    usersRepository = {
      getUserByEmail: jest.fn(),
      getUserByPhone: jest.fn(),
      createUser: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    emailVerificationService = {
      createVerificationToken: jest.fn(),
      verifyEmail: jest.fn(),
    };

    mailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    passwordResetService = {
      createPasswordResetToken: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: EmailVerificationService,
          useValue: emailVerificationService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: PasswordResetService,
          useValue: passwordResetService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getAuth', () => {
    it('should return Auth', () => {
      expect(service.getAuth()).toBe('Auth');
    });
  });

  describe('signIn', () => {
    const user = {
      id: 'user-1',
      email: 'juan@example.com',
      password_hash: 'hashed-password',
      roles: ['client'],
      isEmailVerified: true,
    };

    it('should login successfully with valid credentials', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);


      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.signIn(
        'juan@example.com',
        'Password123!',
      );

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        'juan@example.com',
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Password123!',
        'hashed-password',
      );

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: 'user-1',
        roles: ['client'],
      });

      expect(result).toEqual({
        message: 'Usuario logueado',
        token: 'jwt-token',
      });
    });

    it('should reject when the user does not exist', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);

      await expect(
        service.signIn('unknown@example.com', 'Password123!'),
      ).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should reject when the user has no password hash', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        ...user,
        password_hash: null,
      });

      await expect(
        service.signIn('juan@example.com', 'Password123!'),
      ).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should reject when the password is invalid', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);


      await expect(
        service.signIn('juan@example.com', 'WrongPassword'),
      ).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should reject when the email has not been verified', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        ...user,
        isEmailVerified: false,
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.signIn('juan@example.com', 'Password123!'),
      ).rejects.toThrow(
        new ForbiddenException(
          'Debes verificar tu correo electrónico antes de iniciar sesión',
        ),
      );

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should propagate errors from getUserByEmail', async () => {
      const error = new Error('Database error');

      usersRepository.getUserByEmail.mockRejectedValue(error);

      await expect(
        service.signIn('juan@example.com', 'Password123!'),
      ).rejects.toThrow(error);
    });

    it('should propagate bcrypt errors', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(user);

      const error = new Error('Bcrypt error');

      (bcrypt.compare as jest.Mock).mockRejectedValue(error);


      await expect(
        service.signIn('juan@example.com', 'Password123!'),
      ).rejects.toThrow(error);
    });
  });

  describe('signUp', () => {
    const newUserData = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3411234567',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    } as any;

    const createdUser = {
      id: 'user-1',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3411234567',
      password_hash: 'hashed-password',
      authProvider: AuthProvider.LOCAL,
      providerId: null,
      isEmailVerified: true,
    };

    it('should create a local user successfully', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashed-password' as never);

      usersRepository.createUser.mockResolvedValue(createdUser);

      emailVerificationService.createVerificationToken.mockResolvedValue(
        'verification-token',
      );

      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.signUp(newUserData);

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        newUserData.email,
      );

      expect(usersRepository.getUserByPhone).toHaveBeenCalledWith(
        newUserData.phone,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        newUserData.password,
        10,
      );

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '3411234567',
        password_hash: 'hashed-password',
        authProvider: AuthProvider.LOCAL,
        providerId: null,
        isEmailVerified: true,
      });

      expect(
        emailVerificationService.createVerificationToken,
      ).toHaveBeenCalledWith('user-1');

      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'juan@example.com',
        'verification-token',
      );

      expect(result).toEqual({
        message:
          'Usuario registrado correctamente. Ya podés iniciar sesión.',
        user: createdUser,
      });
    });

    it('should reject when the email already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(createdUser);

      await expect(service.signUp(newUserData)).rejects.toThrow(
        new ConflictException('El email ya esta registrado'),
      );

      expect(usersRepository.getUserByPhone).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should reject when the phone already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(createdUser);

      await expect(service.signUp(newUserData)).rejects.toThrow(
        new ConflictException('El telefono ya esta registrado'),
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should continue registration when verification email fails', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashed-password' as never);

      usersRepository.createUser.mockResolvedValue(createdUser);

      emailVerificationService.createVerificationToken.mockRejectedValue(
        new Error('SMTP unavailable'),
      );

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const result = await service.signUp(newUserData);

      expect(result).toEqual({
        message:
          'Usuario registrado correctamente. Ya podés iniciar sesión.',
        user: createdUser,
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should continue registration when sending the verification email fails', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashed-password' as never);

      usersRepository.createUser.mockResolvedValue(createdUser);

      emailVerificationService.createVerificationToken.mockResolvedValue(
        'verification-token',
      );

      mailService.sendVerificationEmail.mockRejectedValue(
        new Error('SMTP unavailable'),
      );

      jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = await service.signUp(newUserData);

      expect(result.user).toEqual(createdUser);
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should propagate bcrypt errors', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      const error = new Error('Hash failed');

      jest.spyOn(bcrypt, 'hash').mockRejectedValue(error);

      await expect(service.signUp(newUserData)).rejects.toThrow(error);

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should propagate repository errors when creating the user', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashed-password' as never);

      const error = new Error('Database error');

      usersRepository.createUser.mockRejectedValue(error);

      await expect(service.signUp(newUserData)).rejects.toThrow(error);
    });
  });

  describe('googleSignIn', () => {
    let googleClient: {
      verifyIdToken: jest.Mock;
    };

    beforeEach(() => {
      googleClient = (service as any).googleClient;
    });

    it('should login an existing Google user', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'juan@gmail.com',
          email_verified: true,
          sub: 'google-user-123',
          name: 'Juan Pérez',
        }),
      });

      const existingUser = {
        id: 'user-1',
        email: 'juan@gmail.com',
        roles: ['client'],
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-user-123',
      };

      usersRepository.getUserByEmail.mockResolvedValue(existingUser);
      jwtService.sign.mockReturnValue('google-jwt');

      const result = await service.googleSignIn('google-id-token');

      expect(googleClient.verifyIdToken).toHaveBeenCalledWith({
        idToken: 'google-id-token',
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: 'user-1',
        roles: ['client'],
      });

      expect(result).toEqual({
        message: 'Usuario logueado con Google',
        token: 'google-jwt',
      });
    });

    it('should reject an invalid Google payload', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => undefined,
      });

      await expect(
        service.googleSignIn('invalid-token'),
      ).rejects.toThrow(
        new UnauthorizedException('Token de Google inválido'),
      );

      expect(usersRepository.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should reject a Google payload without email', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-user-123',
          email_verified: true,
        }),
      });

      await expect(
        service.googleSignIn('google-token'),
      ).rejects.toThrow(
        new UnauthorizedException('Token de Google inválido'),
      );
    });

    it('should reject an unverified Google email', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'juan@gmail.com',
          email_verified: false,
          sub: 'google-user-123',
        }),
      });

      await expect(
        service.googleSignIn('google-token'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'El correo asociado a la cuenta de Google no está verificado',
        ),
      );

      expect(usersRepository.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should reject when an existing local account uses the same email', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'juan@example.com',
          email_verified: true,
          sub: 'google-user-123',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'juan@example.com',
        authProvider: AuthProvider.LOCAL,
      });

      await expect(
        service.googleSignIn('google-token'),
      ).rejects.toThrow(
        new ConflictException(
          'Este email ya está registrado mediante autenticación local',
        ),
      );
    });

    it('should reject when the Google provider id does not match', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'juan@gmail.com',
          email_verified: true,
          sub: 'google-user-new',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'juan@gmail.com',
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-user-original',
      });

      await expect(
        service.googleSignIn('google-token'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'La cuenta de Google no coincide con el usuario registrado',
        ),
      );
    });

    it('should return a registration token for a new Google user', async () => {
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'nuevo@gmail.com',
          email_verified: true,
          sub: 'google-user-456',
          name: 'Nuevo Usuario',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue(null);

      jwtService.sign.mockReturnValue('registration-token');

      const result = await service.googleSignIn('google-token');

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: 'nuevo@gmail.com',
          name: 'Nuevo Usuario',
          providerId: 'google-user-456',
          type: 'google_registration',
        },
        { expiresIn: '15m' },
      );

      expect(result).toEqual({
        needsPhone: true,
        registrationToken: 'registration-token',
      });
    });

    it('should propagate Google verification errors', async () => {
      const error = new Error('Google verification failed');

      googleClient.verifyIdToken.mockRejectedValue(error);

      await expect(
        service.googleSignIn('google-token'),
      ).rejects.toThrow(error);
    });
  });

  describe('googleCompleteSignUp', () => {
    const decodedToken = {
      email: 'nuevo@gmail.com',
      name: 'Nuevo Usuario',
      providerId: 'google-user-123',
      type: 'google_registration',
    };

    beforeEach(() => {
      jwtService.verify.mockReturnValue(decodedToken);
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      usersRepository.createUser.mockResolvedValue({
        id: 'user-1',
        email: decodedToken.email,
        roles: ['client'],
      });

      jwtService.sign.mockReturnValue('final-jwt');
    });

    it('should complete Google registration successfully', async () => {
      usersRepository.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: decodedToken.email,
          roles: ['client'],
        });

      const result = await service.googleCompleteSignUp(
        'registration-token',
        '3411234567',
        'Argentina',
        'Calle Falsa 123',
        'Rosario',
      );

      expect(jwtService.verify).toHaveBeenCalledWith(
        'registration-token',
      );

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        decodedToken.email,
      );

      expect(usersRepository.getUserByPhone).toHaveBeenCalledWith(
        '3411234567',
      );

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        name: 'Nuevo Usuario',
        email: 'nuevo@gmail.com',
        phone: '3411234567',
        country: 'Argentina',
        address: 'Calle Falsa 123',
        city: 'Rosario',
        password_hash: null,
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-user-123',
        isEmailVerified: true,
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: 'user-1',
        roles: ['client'],
      });

      expect(result).toEqual({
        message: 'Usuario registrado con Google',
        token: 'final-jwt',
      });
    });

    it('should reject an invalid registration token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Expired token');
      });

      await expect(
        service.googleCompleteSignUp(
          'invalid-token',
          '3411234567',
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          'El registro expiró, intentá de nuevo.',
        ),
      );

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should reject a token with an invalid type', async () => {
      jwtService.verify.mockReturnValue({
        ...decodedToken,
        type: 'access_token',
      });

      await expect(
        service.googleCompleteSignUp(
          'registration-token',
          '3411234567',
        ),
      ).rejects.toThrow(
        new UnauthorizedException('Token de registro inválido'),
      );

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should reject when the email already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'existing-user',
        email: decodedToken.email,
      });

      await expect(
        service.googleCompleteSignUp(
          'registration-token',
          '3411234567',
        ),
      ).rejects.toThrow(
        new ConflictException('El email ya está registrado'),
      );

      expect(usersRepository.getUserByPhone).not.toHaveBeenCalled();
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should reject when the phone already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue({
        id: 'existing-user',
        phone: '3411234567',
      });

      await expect(
        service.googleCompleteSignUp(
          'registration-token',
          '3411234567',
        ),
      ).rejects.toThrow(
        new ConflictException('El teléfono ya está registrado'),
      );

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should use email as the name when Google does not provide a name', async () => {
      jwtService.verify.mockReturnValue({
        ...decodedToken,
        name: undefined,
      });

      usersRepository.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: decodedToken.email,
          roles: ['client'],
        });

      await service.googleCompleteSignUp(
        'registration-token',
        '3411234567',
      );

      expect(usersRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: decodedToken.email,
        }),
      );
    });

    it('should throw when the created user cannot be retrieved', async () => {
      usersRepository.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.googleCompleteSignUp(
          'registration-token',
          '3411234567',
        ),
      ).rejects.toThrow(
        new UnauthorizedException('Error al crear el usuario'),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should delegate email verification to EmailVerificationService', async () => {
      emailVerificationService.verifyEmail.mockResolvedValue(undefined);

      await service.verifyEmail('verification-token');

      expect(
        emailVerificationService.verifyEmail,
      ).toHaveBeenCalledTimes(1);

      expect(
        emailVerificationService.verifyEmail,
      ).toHaveBeenCalledWith('verification-token');
    });

    it('should propagate errors from EmailVerificationService', async () => {
      const error = new Error('Invalid verification token');

      emailVerificationService.verifyEmail.mockRejectedValue(error);

      await expect(
        service.verifyEmail('invalid-token'),
      ).rejects.toThrow(error);
    });
  });

  describe('forgotPassword', () => {
    const genericMessage =
      'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña';

    it('should create a reset token and send an email for a valid local user', async () => {
      const user = {
        id: 'user-1',
        email: 'juan@example.com',
        password_hash: 'hashed-password',
      };

      usersRepository.getUserByEmail.mockResolvedValue(user);

      passwordResetService.createPasswordResetToken.mockResolvedValue(
        'reset-token',
      );

      mailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(
        'juan@example.com',
      );

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        'juan@example.com',
      );

      expect(
        passwordResetService.createPasswordResetToken,
      ).toHaveBeenCalledWith('user-1');

      expect(
        mailService.sendPasswordResetEmail,
      ).toHaveBeenCalledWith(
        'juan@example.com',
        'reset-token',
      );

      expect(result).toBe(genericMessage);
    });

    it('should return the generic message when the user does not exist', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(
        'unknown@example.com',
      );

      expect(result).toBe(genericMessage);

      expect(
        passwordResetService.createPasswordResetToken,
      ).not.toHaveBeenCalled();

      expect(
        mailService.sendPasswordResetEmail,
      ).not.toHaveBeenCalled();
    });

    it('should return the generic message when the user has no password', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'google-user',
        email: 'google@example.com',
        password_hash: null,
      });

      const result = await service.forgotPassword(
        'google@example.com',
      );

      expect(result).toBe(genericMessage);

      expect(
        passwordResetService.createPasswordResetToken,
      ).not.toHaveBeenCalled();

      expect(
        mailService.sendPasswordResetEmail,
      ).not.toHaveBeenCalled();
    });

    it('should propagate reset token creation errors', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'juan@example.com',
        password_hash: 'hashed-password',
      });

      const error = new Error('Could not create reset token');

      passwordResetService.createPasswordResetToken.mockRejectedValue(
        error,
      );

      await expect(
        service.forgotPassword('juan@example.com'),
      ).rejects.toThrow(error);

      expect(
        mailService.sendPasswordResetEmail,
      ).not.toHaveBeenCalled();
    });

    it('should propagate password reset email errors', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'juan@example.com',
        password_hash: 'hashed-password',
      });

      passwordResetService.createPasswordResetToken.mockResolvedValue(
        'reset-token',
      );

      const error = new Error('SMTP unavailable');

      mailService.sendPasswordResetEmail.mockRejectedValue(error);

      await expect(
        service.forgotPassword('juan@example.com'),
      ).rejects.toThrow(error);
    });
  });

  describe('resetPassword', () => {
    it('should delegate password reset to PasswordResetService', async () => {
      passwordResetService.resetPassword.mockResolvedValue(
        'Contraseña actualizada correctamente',
      );

      const result = await service.resetPassword(
        'reset-token',
        'NewPassword123!',
      );

      expect(
        passwordResetService.resetPassword,
      ).toHaveBeenCalledTimes(1);

      expect(
        passwordResetService.resetPassword,
      ).toHaveBeenCalledWith(
        'reset-token',
        'NewPassword123!',
      );

      expect(result).toBe(
        'Contraseña actualizada correctamente',
      );
    });

    it('should propagate errors from PasswordResetService', async () => {
      const error = new Error(
        'El token de recuperación no es válido',
      );

      passwordResetService.resetPassword.mockRejectedValue(error);

      await expect(
        service.resetPassword(
          'invalid-token',
          'NewPassword123!',
        ),
      ).rejects.toThrow(error);

      expect(
        passwordResetService.resetPassword,
      ).toHaveBeenCalledWith(
        'invalid-token',
        'NewPassword123!',
      );
    });
  });
});
