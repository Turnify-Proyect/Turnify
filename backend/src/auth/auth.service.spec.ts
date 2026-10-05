import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { JwtService } from '@nestjs/jwt';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { MailService } from '../mail/mail.service';
import { AuthProvider } from '../common/authProvider.enum';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  // ===========================================================================
  // getAuth
  // ===========================================================================

  describe('getAuth', () => {
    it('debería retornar Auth', () => {
      expect(service.getAuth()).toBe('Auth');
    });
  });

  // ===========================================================================
  // signIn
  // ===========================================================================

  describe('signIn', () => {
    const user = {
      id: 'user-1',
      email: 'test@test.com',
      password_hash: 'hashed-password',
      roles: ['user'],
      isEmailVerified: true,
    };

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);

      await expect(service.signIn('test@test.com', 'password')).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        'test@test.com',
      );
    });

    it('debería lanzar UnauthorizedException si el usuario no tiene password', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        ...user,
        password_hash: null,
      });

      await expect(service.signIn('test@test.com', 'password')).rejects.toThrow(
        new UnauthorizedException('Credenciales incorrectas'),
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn('test@test.com', 'password-incorrecta'),
      ).rejects.toThrow(new UnauthorizedException('Credenciales incorrectas'));

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password-incorrecta',
        'hashed-password',
      );
    });

    it('debería lanzar ForbiddenException si el email no está verificado', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        ...user,
        isEmailVerified: false,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signIn('test@test.com', 'password')).rejects.toThrow(
        new ForbiddenException(
          'Debes verificar tu correo electrónico antes de iniciar sesión',
        ),
      );
    });

    it('debería generar JWT y retornar token si las credenciales son correctas', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.signIn('test@test.com', 'password');

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: 'user-1',
        roles: ['user'],
      });

      expect(result).toEqual({
        message: 'Usuario logueado',
        token: 'jwt-token',
      });
    });
  });

  // ===========================================================================
  // signUp
  // ===========================================================================

  describe('signUp', () => {
    const userDto = {
      name: 'Juan',
      email: 'juan@test.com',
      phone: '123456789',
      password: 'password123',
      confirmPassword: 'password123',
      country: 'Argentina',
      address: 'Calle 123',
      city: 'Rosario',
    };

    const createdUser = {
      id: 'user-1',
      name: 'Juan',
      email: 'juan@test.com',
      phone: '123456789',
      roles: ['user'],
    };

    it('debería lanzar ConflictException si el email ya existe', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(createdUser);

      await expect(service.signUp(userDto)).rejects.toThrow(
        new ConflictException('El email ya esta registrado'),
      );

      expect(usersRepository.getUserByPhone).not.toHaveBeenCalled();
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el teléfono ya existe', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(createdUser);

      await expect(service.signUp(userDto)).rejects.toThrow(
        new ConflictException('El telefono ya esta registrado'),
      );

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('debería hashear la contraseña y crear el usuario', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      usersRepository.createUser.mockResolvedValue(createdUser);

      emailVerificationService.createVerificationToken.mockResolvedValue(
        'verification-token',
      );

      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.signUp(userDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        name: 'Juan',
        country: 'Argentina',
        address: 'Calle 123',
        city: 'Rosario',
        email: 'juan@test.com',
        phone: '123456789',
        password_hash: 'hashed-password',
        authProvider: AuthProvider.LOCAL,
        providerId: null,
        isEmailVerified: true,
      });

      expect(result).toEqual({
        message: 'Usuario registrado correctamente. Ya podés iniciar sesión.',
        user: createdUser,
      });
    });

    it('debería enviar el email de verificación después de crear el usuario', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      usersRepository.createUser.mockResolvedValue(createdUser);

      emailVerificationService.createVerificationToken.mockResolvedValue(
        'verification-token',
      );

      await service.signUp(userDto);

      expect(
        emailVerificationService.createVerificationToken,
      ).toHaveBeenCalledWith('user-1');

      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'juan@test.com',
        'verification-token',
      );
    });

    it('no debería fallar el registro si falla el envío del email', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      usersRepository.createUser.mockResolvedValue(createdUser);

      emailVerificationService.createVerificationToken.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.signUp(userDto);

      expect(result.user).toEqual(createdUser);
      expect(usersRepository.createUser).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // googleSignIn
  // ===========================================================================

  describe('googleSignIn', () => {
    it('debería rechazar un token de Google inválido', async () => {
      const googleClient = (service as any).googleClient;

      jest
        .spyOn(googleClient, 'verifyIdToken')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(service.googleSignIn('invalid-token')).rejects.toThrow(
        'Invalid token',
      );
    });

    it('debería rechazar si Google no devuelve payload', async () => {
      const googleClient = (service as any).googleClient;

      jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => null,
      });

      await expect(service.googleSignIn('google-token')).rejects.toThrow(
        new UnauthorizedException('Token de Google inválido'),
      );
    });

    it('debería rechazar si el email de Google no está verificado', async () => {
      const googleClient = (service as any).googleClient;

      jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'google@test.com',
          email_verified: false,
          sub: 'google-123',
        }),
      });

      await expect(service.googleSignIn('google-token')).rejects.toThrow(
        new UnauthorizedException(
          'El correo asociado a la cuenta de Google no está verificado',
        ),
      );
    });

    it('debería rechazar si el email ya pertenece a una cuenta local', async () => {
      const googleClient = (service as any).googleClient;

      jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'google@test.com',
          email_verified: true,
          sub: 'google-123',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'google@test.com',
        authProvider: AuthProvider.LOCAL,
      });

      await expect(service.googleSignIn('google-token')).rejects.toThrow(
        new ConflictException(
          'Este email ya está registrado mediante autenticación local',
        ),
      );
    });

    it('debería rechazar si el providerId no coincide', async () => {
      const googleClient = (service as any).googleClient;

      jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'google@test.com',
          email_verified: true,
          sub: 'google-123',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'google@test.com',
        authProvider: AuthProvider.GOOGLE,
        providerId: 'otro-google-id',
      });

      await expect(service.googleSignIn('google-token')).rejects.toThrow(
        new UnauthorizedException(
          'La cuenta de Google no coincide con el usuario registrado',
        ),
      );
    });

    it('debería loguear un usuario Google existente', async () => {
      const googleClient = (service as any).googleClient;

      jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'google@test.com',
          email_verified: true,
          sub: 'google-123',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'google@test.com',
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-123',
        roles: ['user'],
      });

      jwtService.sign.mockReturnValue('google-jwt');

      const result = await service.googleSignIn('google-token');

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: 'user-1',
        roles: ['user'],
      });

      expect(result).toEqual({
        message: 'Usuario logueado con Google',
        token: 'google-jwt',
      });
    });

    it('debería devolver registrationToken si el usuario Google no existe', async () => {
      const googleClient = (service as any).googleClient;

      jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'nuevo@test.com',
          email_verified: true,
          sub: 'google-456',
          name: 'Nuevo Usuario',
        }),
      });

      usersRepository.getUserByEmail.mockResolvedValue(null);
      jwtService.sign.mockReturnValue('registration-token');

      const result = await service.googleSignIn('google-token');

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: 'nuevo@test.com',
          name: 'Nuevo Usuario',
          providerId: 'google-456',
          type: 'google_registration',
        },
        { expiresIn: '15m' },
      );

      expect(result).toEqual({
        needsPhone: true,
        registrationToken: 'registration-token',
      });
    });
  });

  // ===========================================================================
  // googleCompleteSignUp
  // ===========================================================================

  describe('googleCompleteSignUp', () => {
    it('debería rechazar un registrationToken inválido o expirado', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(
        service.googleCompleteSignUp('invalid-token', '123456'),
      ).rejects.toThrow(
        new UnauthorizedException('El registro expiró, intentá de nuevo.'),
      );
    });

    it('debería rechazar un token que no sea de registro Google', async () => {
      jwtService.verify.mockReturnValue({
        email: 'test@test.com',
        type: 'otro_tipo',
      });

      await expect(
        service.googleCompleteSignUp('token', '123456'),
      ).rejects.toThrow(
        new UnauthorizedException('Token de registro inválido'),
      );
    });

    it('debería rechazar si el email ya existe', async () => {
      jwtService.verify.mockReturnValue({
        email: 'test@test.com',
        name: 'Test',
        providerId: 'google-123',
        type: 'google_registration',
      });

      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(
        service.googleCompleteSignUp('token', '123456'),
      ).rejects.toThrow(new ConflictException('El email ya está registrado'));

      expect(usersRepository.getUserByPhone).not.toHaveBeenCalled();
    });

    it('debería rechazar si el teléfono ya existe', async () => {
      jwtService.verify.mockReturnValue({
        email: 'test@test.com',
        name: 'Test',
        providerId: 'google-123',
        type: 'google_registration',
      });

      usersRepository.getUserByEmail.mockResolvedValue(null);

      usersRepository.getUserByPhone.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(
        service.googleCompleteSignUp('token', '123456'),
      ).rejects.toThrow(
        new ConflictException('El teléfono ya está registrado'),
      );

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('debería crear el usuario Google y devolver JWT', async () => {
      jwtService.verify.mockReturnValue({
        email: 'google@test.com',
        name: 'Usuario Google',
        providerId: 'google-123',
        type: 'google_registration',
      });

      usersRepository.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'google@test.com',
          roles: ['user'],
        });

      usersRepository.getUserByPhone.mockResolvedValue(null);

      jwtService.sign.mockReturnValue('google-jwt');

      const result = await service.googleCompleteSignUp(
        'registration-token',
        '123456',
        'Argentina',
        'Calle 123',
        'Rosario',
      );

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        name: 'Usuario Google',
        email: 'google@test.com',
        phone: '123456',
        country: 'Argentina',
        address: 'Calle 123',
        city: 'Rosario',
        password_hash: null,
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-123',
        isEmailVerified: true,
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: 'user-1',
        roles: ['user'],
      });

      expect(result).toEqual({
        message: 'Usuario registrado con Google',
        token: 'google-jwt',
      });
    });

    it('debería usar email como nombre si Google no proporciona name', async () => {
      jwtService.verify.mockReturnValue({
        email: 'google@test.com',
        name: undefined,
        providerId: 'google-123',
        type: 'google_registration',
      });

      usersRepository.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'google@test.com',
          roles: ['user'],
        });

      usersRepository.getUserByPhone.mockResolvedValue(null);
      jwtService.sign.mockReturnValue('google-jwt');

      await service.googleCompleteSignUp('registration-token', '123456');

      expect(usersRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'google@test.com',
        }),
      );
    });

    it('debería lanzar UnauthorizedException si el usuario no aparece después de crearlo', async () => {
      jwtService.verify.mockReturnValue({
        email: 'google@test.com',
        name: 'Test',
        providerId: 'google-123',
        type: 'google_registration',
      });

      usersRepository.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      usersRepository.getUserByPhone.mockResolvedValue(null);

      await expect(
        service.googleCompleteSignUp('token', '123456'),
      ).rejects.toThrow(new UnauthorizedException('Error al crear el usuario'));
    });
  });

  // ===========================================================================
  // verifyEmail
  // ===========================================================================

  describe('verifyEmail', () => {
    it('debería delegar la verificación al EmailVerificationService', async () => {
      emailVerificationService.verifyEmail.mockResolvedValue(undefined);

      await service.verifyEmail('verification-token');

      expect(emailVerificationService.verifyEmail).toHaveBeenCalledWith(
        'verification-token',
      );
    });

    it('debería propagar el error del EmailVerificationService', async () => {
      emailVerificationService.verifyEmail.mockRejectedValue(
        new UnauthorizedException('Token inválido'),
      );

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });
  });
});
