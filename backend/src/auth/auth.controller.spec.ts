import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    getAuth: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    googleSignIn: jest.fn(),
    googleCompleteSignUp: jest.fn(),
    verifyEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAuth', () => {
    it('debería devolver la información de autenticación', () => {
      authServiceMock.getAuth.mockReturnValue('Auth funcionando');

      const result = controller.getAuth();

      expect(result).toBe('Auth funcionando');
      expect(authServiceMock.getAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('signIn', () => {
    it('debería llamar al service con email y password', () => {
      const credentials = {
        email: 'usuario@test.com',
        password: 'Password123',
      };

      const serviceResult = {
        access_token: 'jwt-token',
      };

      authServiceMock.signIn.mockReturnValue(serviceResult);

      const result = controller.signIn(credentials);

      expect(result).toEqual(serviceResult);

      expect(authServiceMock.signIn).toHaveBeenCalledTimes(1);
      expect(authServiceMock.signIn).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
      );
    });
  });

  describe('signUp', () => {
    it('debería llamar al service con los datos del nuevo usuario', () => {
      const newUserData = {
        email: 'nuevo@test.com',
        password: 'Password123',
        name: 'Juan',
      };

      const serviceResult = {
        id: 'user-1',
        email: 'nuevo@test.com',
      };

      authServiceMock.signUp.mockReturnValue(serviceResult);

      const result = controller.signUp(newUserData as any);

      expect(result).toEqual(serviceResult);

      expect(authServiceMock.signUp).toHaveBeenCalledTimes(1);
      expect(authServiceMock.signUp).toHaveBeenCalledWith(newUserData);
    });
  });

  describe('googleSignIn', () => {
    it('debería llamar al service con el credential recibido', () => {
      const credential = 'google-credential-token';

      const serviceResult = {
        access_token: 'jwt-token',
      };

      authServiceMock.googleSignIn.mockReturnValue(serviceResult);

      const result = controller.googleSignIn(credential);

      expect(result).toEqual(serviceResult);

      expect(authServiceMock.googleSignIn).toHaveBeenCalledTimes(1);
      expect(authServiceMock.googleSignIn).toHaveBeenCalledWith(credential);
    });
  });

  describe('googleCompleteSignUp', () => {
    it('debería llamar al service con todos los datos recibidos', () => {
      const registrationToken = 'registration-token';
      const phone = '3411234567';
      const country = 'Argentina';
      const address = 'Calle 123';
      const city = 'Rosario';

      const serviceResult = {
        access_token: 'jwt-token',
      };

      authServiceMock.googleCompleteSignUp.mockReturnValue(serviceResult);

      const result = controller.googleCompleteSignUp(
        registrationToken,
        phone,
        country,
        address,
        city,
      );

      expect(result).toEqual(serviceResult);

      expect(authServiceMock.googleCompleteSignUp).toHaveBeenCalledTimes(1);
      expect(authServiceMock.googleCompleteSignUp).toHaveBeenCalledWith(
        registrationToken,
        phone,
        country,
        address,
        city,
      );
    });

    it('debería permitir datos opcionales indefinidos', () => {
      const registrationToken = 'registration-token';
      const phone = '3411234567';

      authServiceMock.googleCompleteSignUp.mockReturnValue({
        access_token: 'jwt-token',
      });

      controller.googleCompleteSignUp(
        registrationToken,
        phone,
        undefined,
        undefined,
        undefined,
      );

      expect(authServiceMock.googleCompleteSignUp).toHaveBeenCalledWith(
        registrationToken,
        phone,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('verifyEmail', () => {
    it('debería verificar el email usando el token recibido', async () => {
      const token = 'verification-token';

      authServiceMock.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail({ token });

      expect(result).toEqual({
        message: 'Email verificado correctamente',
      });

      expect(authServiceMock.verifyEmail).toHaveBeenCalledTimes(1);
      expect(authServiceMock.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('debería propagar el error del service', async () => {
      const token = 'invalid-token';

      const error = new Error('Token inválido');

      authServiceMock.verifyEmail.mockRejectedValue(error);

      await expect(controller.verifyEmail({ token })).rejects.toThrow(
        'Token inválido',
      );

      expect(authServiceMock.verifyEmail).toHaveBeenCalledWith(token);
    });
  });
});
