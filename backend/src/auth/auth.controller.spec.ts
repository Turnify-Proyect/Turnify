import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/create-user.dto';
import { VerifyEmailDto } from './email-verification/dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    getAuth: jest.Mock;
    signIn: jest.Mock;
    signUp: jest.Mock;
    googleSignIn: jest.Mock;
    googleCompleteSignUp: jest.Mock;
    verifyEmail: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      getAuth: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      googleSignIn: jest.fn(),
      googleCompleteSignUp: jest.fn(),
      verifyEmail: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuth', () => {
    it('should return the value provided by AuthService', () => {
      authService.getAuth.mockReturnValue('Informacion de autenticacion');

      const result = controller.getAuth();

      expect(result).toBe('Informacion de autenticacion');
      expect(authService.getAuth).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from AuthService', () => {
      const error = new Error('Auth service error');

      authService.getAuth.mockImplementation(() => {
        throw error;
      });

      expect(() => controller.getAuth()).toThrow(error);
    });
  });

  describe('signIn', () => {
it('should call AuthService.signIn with email and password', async () => {
  const credentials: LoginUserDto = {
    email: 'juan@example.com',
    password: 'Password123!',
  };

  const serviceResponse = {
    access_token: 'jwt-token',
  };

  authService.signIn.mockResolvedValue(serviceResponse);

  const result = await controller.signIn(credentials);

  expect(authService.signIn).toHaveBeenCalledTimes(1);
  expect(authService.signIn).toHaveBeenCalledWith(
    credentials.email,
    credentials.password,
  );
  expect(result).toEqual(serviceResponse);
});


    it('should return the AuthService.signIn result', async () => {
      const credentials: LoginUserDto = {
        email: 'maria@example.com',
        password: 'Password456!',
      };

      const serviceResponse = {
        access_token: 'another-jwt-token',
        user: {
          id: 'user-1',
        },
      };

      authService.signIn.mockResolvedValue(serviceResponse);

      const result = await controller.signIn(credentials);

      expect(result).toEqual(serviceResponse);
    });

    it('should propagate errors from AuthService.signIn', async () => {
      const credentials: LoginUserDto = {
        email: 'juan@example.com',
        password: 'wrong-password',
      };

      const error = new Error('Credenciales invalidas');

      authService.signIn.mockRejectedValue(error);

      await expect(controller.signIn(credentials)).rejects.toThrow(error);

      expect(authService.signIn).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
      );
    });
  });

  describe('signUp', () => {
    it('should call AuthService.signUp with the provided user data', async () => {
      const newUserData = {
        email: 'juan@example.com',
        password: 'Password123!',
        name: 'Juan Pérez',
      } as CreateUserDto;

      const serviceResponse = {
        id: 'user-1',
        email: newUserData.email,
      };

      authService.signUp.mockResolvedValue(serviceResponse);

      const result = await controller.signUp(newUserData);

      expect(authService.signUp).toHaveBeenCalledTimes(1);
      expect(authService.signUp).toHaveBeenCalledWith(newUserData);
      expect(result).toEqual(serviceResponse);
    });

    it('should propagate errors from AuthService.signUp', async () => {
      const newUserData = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Juan Pérez',
      } as CreateUserDto;

      const error = new Error('El email ya está registrado');

      authService.signUp.mockRejectedValue(error);

      await expect(controller.signUp(newUserData)).rejects.toThrow(error);

      expect(authService.signUp).toHaveBeenCalledWith(newUserData);
    });
  });

  describe('googleSignIn', () => {
    it('should call AuthService.googleSignIn with the credential', async () => {
      const credential = 'google-credential-token';

      const serviceResponse = {
        access_token: 'jwt-token',
      };

      authService.googleSignIn.mockResolvedValue(serviceResponse);

      const result = await controller.googleSignIn(credential);

      expect(authService.googleSignIn).toHaveBeenCalledTimes(1);
      expect(authService.googleSignIn).toHaveBeenCalledWith(credential);
      expect(result).toEqual(serviceResponse);
    });

    it('should propagate errors from AuthService.googleSignIn', async () => {
      const credential = 'invalid-google-credential';
      const error = new Error('Google authentication failed');

      authService.googleSignIn.mockRejectedValue(error);

      await expect(controller.googleSignIn(credential)).rejects.toThrow(error);

      expect(authService.googleSignIn).toHaveBeenCalledWith(credential);
    });
  });

  describe('googleCompleteSignUp', () => {
    it('should call AuthService.googleCompleteSignUp with all provided data', async () => {
      const registrationToken = 'registration-token';
      const phone = '3411234567';
      const country = 'Argentina';
      const address = 'Calle Falsa 123';
      const city = 'Rosario';

      const serviceResponse = {
        access_token: 'jwt-token',
      };

      authService.googleCompleteSignUp.mockResolvedValue(serviceResponse);

      const result = await controller.googleCompleteSignUp(
        registrationToken,
        phone,
        country,
        address,
        city,
      );

      expect(authService.googleCompleteSignUp).toHaveBeenCalledTimes(1);
      expect(authService.googleCompleteSignUp).toHaveBeenCalledWith(
        registrationToken,
        phone,
        country,
        address,
        city,
      );
      expect(result).toEqual(serviceResponse);
    });

    it('should support optional fields', async () => {
      const registrationToken = 'registration-token';
      const phone = '3411234567';

      authService.googleCompleteSignUp.mockResolvedValue({
        access_token: 'jwt-token',
      });

      await controller.googleCompleteSignUp(
        registrationToken,
        phone,
        undefined,
        undefined,
        undefined,
      );

      expect(authService.googleCompleteSignUp).toHaveBeenCalledWith(
        registrationToken,
        phone,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should propagate errors from AuthService.googleCompleteSignUp', async () => {
      const error = new Error('Could not complete Google registration');

      authService.googleCompleteSignUp.mockRejectedValue(error);

      await expect(
        controller.googleCompleteSignUp(
          'registration-token',
          '3411234567',
          'Argentina',
          'Calle Falsa 123',
          'Rosario',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('verifyEmail', () => {
    it('should call AuthService.verifyEmail with the token', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'verification-token',
      };

      authService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledTimes(1);
      expect(authService.verifyEmail).toHaveBeenCalledWith(
        verifyEmailDto.token,
      );

      expect(result).toEqual({
        message: 'Email verificado correctamente',
      });
    });

    it('should return the expected success message', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'valid-token',
      };

      authService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result.message).toBe('Email verificado correctamente');
    });

    it('should propagate errors from AuthService.verifyEmail', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'invalid-token',
      };

      const error = new Error(
        'Token inválido, expirado o ya utilizado',
      );

      authService.verifyEmail.mockRejectedValue(error);

      await expect(
        controller.verifyEmail(verifyEmailDto),
      ).rejects.toThrow(error);

      expect(authService.verifyEmail).toHaveBeenCalledWith(
        verifyEmailDto.token,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should call AuthService.forgotPassword with the email', async () => {
      const forgotPasswordDto = {
        email: 'juan@example.com',
      } as ForgotPasswordDto;

      const serviceResponse = {
        message: 'Si el email existe, recibirás instrucciones',
      };

      authService.forgotPassword.mockResolvedValue(serviceResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(result).toEqual(serviceResponse);
    });

    it('should propagate errors from AuthService.forgotPassword', async () => {
      const forgotPasswordDto = {
        email: 'juan@example.com',
      } as ForgotPasswordDto;

      const error = new Error('Could not process password recovery');

      authService.forgotPassword.mockRejectedValue(error);

      await expect(
        controller.forgotPassword(forgotPasswordDto),
      ).rejects.toThrow(error);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
    });
  });

  describe('resetPassword', () => {
    it('should call AuthService.resetPassword with token and new password', async () => {
      const resetPasswordDto = {
        token: 'reset-token',
        newPassword: 'NewPassword123!',
      } as ResetPasswordDto;

      const serviceResponse = 'Contraseña actualizada correctamente';

      authService.resetPassword.mockResolvedValue(serviceResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
      expect(result).toBe(serviceResponse);
    });

    it('should propagate errors from AuthService.resetPassword', async () => {
      const resetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
      } as ResetPasswordDto;

      const error = new Error('El token de recuperación no es válido');

      authService.resetPassword.mockRejectedValue(error);

      await expect(
        controller.resetPassword(resetPasswordDto),
      ).rejects.toThrow(error);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
    });
  });
});
