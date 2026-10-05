import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '../common/userRoles.enum';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    changePassword: jest.fn(),
    removeUser: jest.fn(),
    activateUser: jest.fn(),
    createUserByAdmin: jest.fn(),
    updateUserRoles: jest.fn(),
    updateProfilePicture: jest.fn(),
  };

  const jwtServiceMock = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getAllUsers', () => {
    it('should use default pagination values', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers();

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should parse pagination parameters', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers('2', '10', 'Juan', UserRole.CLIENT, 'true');

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        2,
        10,
        'Juan',
        UserRole.CLIENT,
        true,
      );
    });

    it('should convert isActive false correctly', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers('1', '20', undefined, undefined, 'false');

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        false,
      );
    });

    it('should use undefined when isActive is invalid', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers('1', '5', undefined, undefined, 'invalid');

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should use defaults when pagination values are invalid', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers('abc', '-10', undefined, undefined, undefined);

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('getMyProfile', () => {
    it('should get the authenticated user profile', () => {
      const user = {
        id: 'user-123',
      };

      const expectedUser = {
        id: 'user-123',
        name: 'Juan',
      };

      usersServiceMock.getUserById.mockReturnValue(expectedUser);

      const result = controller.getMyProfile({
        user,
      });

      expect(usersServiceMock.getUserById).toHaveBeenCalledWith('user-123');

      expect(result).toBe(expectedUser);
    });
  });

  describe('getUserById', () => {
    it('should delegate to usersService', () => {
      const id = 'user-123';

      const expectedUser = {
        id,
        name: 'Juan',
      };

      usersServiceMock.getUserById.mockReturnValue(expectedUser);

      const result = controller.getUserById(id);

      expect(usersServiceMock.getUserById).toHaveBeenCalledWith(id);
      expect(result).toBe(expectedUser);
    });
  });

  describe('updateUser', () => {
    it('should update the user', () => {
      const id = 'user-123';

      const dto = {
        name: 'Juan Perez',
        email: 'juan@test.com',
      } as any;

      const expectedResult = {
        message: 'Usuario actualizado',
      };

      usersServiceMock.updateUser.mockReturnValue(expectedResult);

      const result = controller.updateUser(id, dto);

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(id, dto);

      expect(result).toBe(expectedResult);
    });
  });

  describe('changePassword', () => {
    it('should change the user password', () => {
      const id = 'user-123';

      const dto = {
        password: 'NewPassword123!',
      } as any;

      const expectedResult = {
        message: 'Contraseña actualizada correctamente',
      };

      usersServiceMock.changePassword.mockReturnValue(expectedResult);

      const result = controller.changePassword(id, dto);

      expect(usersServiceMock.changePassword).toHaveBeenCalledWith(id, dto);

      expect(result).toBe(expectedResult);
    });
  });

  describe('removeUser', () => {
    it('should remove the user', () => {
      const id = 'user-123';

      const expectedResult = {
        message: 'Usuario eliminado exitosamente',
      };

      usersServiceMock.removeUser.mockReturnValue(expectedResult);

      const result = controller.removeUser(id);

      expect(usersServiceMock.removeUser).toHaveBeenCalledWith(id);
      expect(result).toBe(expectedResult);
    });
  });

  describe('activateUser', () => {
    it('should activate the user', () => {
      const id = 'user-123';

      const expectedResult = {
        message: 'Usuario activado exitosamente',
      };

      usersServiceMock.activateUser.mockReturnValue(expectedResult);

      const result = controller.activateUser(id);

      expect(usersServiceMock.activateUser).toHaveBeenCalledWith(id);
      expect(result).toBe(expectedResult);
    });
  });

  describe('createUserByAdmin', () => {
    it('should create a user through the service', () => {
      const dto = {
        name: 'Juan',
        email: 'juan@test.com',
      } as any;

      const expectedResult = {
        id: 'user-123',
        ...dto,
      };

      usersServiceMock.createUserByAdmin.mockReturnValue(expectedResult);

      const result = controller.createUserByAdmin(dto);

      expect(usersServiceMock.createUserByAdmin).toHaveBeenCalledWith(dto);

      expect(result).toBe(expectedResult);
    });
  });

  describe('updateUserRoles', () => {
    it('should update user roles', () => {
      const id = 'user-123';

      const dto = {
        roles: [UserRole.CLIENT],
      } as any;

      const expectedResult = {
        message: 'Roles actualizados correctamente',
      };

      usersServiceMock.updateUserRoles.mockReturnValue(expectedResult);

      const result = controller.updateUserRoles(id, dto);

      expect(usersServiceMock.updateUserRoles).toHaveBeenCalledWith(id, dto);

      expect(result).toBe(expectedResult);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload the user avatar', () => {
      const id = 'user-123';

      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const expectedResult = {
        id,
        avatar: 'https://cloudinary.com/avatar.jpg',
      };

      usersServiceMock.updateProfilePicture.mockReturnValue(expectedResult);

      const result = controller.uploadAvatar(id, file);

      expect(usersServiceMock.updateProfilePicture).toHaveBeenCalledWith(
        id,
        file,
      );

      expect(result).toBe(expectedResult);
    });
  });
});
