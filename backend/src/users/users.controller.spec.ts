import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '../common/userRoles.enum';

describe('UsersController', () => {
  let controller: UsersController;

  let usersServiceMock: {
    getAllUsers: jest.Mock;
    getUserById: jest.Mock;
    updateUser: jest.Mock;
    changePassword: jest.Mock;
    removeUser: jest.Mock;
    activateUser: jest.Mock;
    createUserByAdmin: jest.Mock;
    updateUserRoles: jest.Mock;
    updateProfilePicture: jest.Mock;
  };

  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    usersServiceMock = {
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

    controller = new UsersController(
      usersServiceMock as unknown as UsersService,
    );
  });

  describe('getAllUsers', () => {
    it('should call the service with default pagination', () => {
      const response = {
        users: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      };

      usersServiceMock.getAllUsers.mockReturnValue(response);

      const result = controller.getAllUsers();

      expect(result).toBe(response);

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should convert pagination and isActive query params', () => {
      const response = {
        users: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      };

      usersServiceMock.getAllUsers.mockReturnValue(response);

      const result = controller.getAllUsers(
        '2',
        '10',
        'Juan',
        UserRole.CLIENT,
        'true',
      );

      expect(result).toBe(response);

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

    it('should use default values for invalid pagination', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers('abc', 'xyz', undefined, undefined, undefined);

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should use default values for zero or negative pagination', () => {
      usersServiceMock.getAllUsers.mockReturnValue([]);

      controller.getAllUsers('0', '-5', undefined, undefined, undefined);

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
    it('should use the authenticated user id', () => {
      const response = {
        id: userId,
        name: 'Juan',
      };

      usersServiceMock.getUserById.mockReturnValue(response);

      const request = {
        user: {
          id: userId,
        },
      };

      const result = controller.getMyProfile(request);

      expect(result).toBe(response);

      expect(usersServiceMock.getUserById).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserById', () => {
    it('should return the user', () => {
      const response = {
        id: userId,
        name: 'Juan',
      };

      usersServiceMock.getUserById.mockReturnValue(response);

      const result = controller.getUserById(userId);

      expect(result).toBe(response);

      expect(usersServiceMock.getUserById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateUser', () => {
    it('should update the user', () => {
      const dto = {
        name: 'Juan Actualizado',
        email: 'juan@example.com',
      };

      const response = {
        id: userId,
        name: 'Juan Actualizado',
      };

      usersServiceMock.updateUser.mockReturnValue(response);

      const result = controller.updateUser(userId, dto as any);

      expect(result).toBe(response);

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('changePassword', () => {
    it('should change the user password', async () => {
      const dto = {
        password: 'NewPassword123!',
      };

      const response = 'Contraseña actualizada correctamente';

      usersServiceMock.changePassword.mockResolvedValue(response);

      const result = await controller.changePassword(userId, dto as any);

      expect(result).toBe(response);

      expect(usersServiceMock.changePassword).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('removeUser', () => {
    it('should remove the user', () => {
      const response = {
        message: 'Usuario desactivado correctamente',
      };

      usersServiceMock.removeUser.mockReturnValue(response);

      const result = controller.removeUser(userId);

      expect(result).toBe(response);

      expect(usersServiceMock.removeUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('activateUser', () => {
    it('should activate the user', () => {
      const response = {
        message: 'Usuario activado correctamente',
      };

      usersServiceMock.activateUser.mockReturnValue(response);

      const result = controller.activateUser(userId);

      expect(result).toBe(response);

      expect(usersServiceMock.activateUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('createUserByAdmin', () => {
    it('should create a user', () => {
      const dto = {
        name: 'Juan',
        email: 'juan@example.com',
        phone: '3411234567',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        roles: [UserRole.CLIENT],
      };

      const response = {
        id: userId,
        name: 'Juan',
      };

      usersServiceMock.createUserByAdmin.mockReturnValue(response);

      const result = controller.createUserByAdmin(dto as any);

      expect(result).toBe(response);

      expect(usersServiceMock.createUserByAdmin).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateUserRoles', () => {
    it('should update user roles', () => {
      const dto = {
        roles: [UserRole.ADMIN],
      };

      const response = {
        id: userId,
        roles: [UserRole.ADMIN],
      };

      usersServiceMock.updateUserRoles.mockReturnValue(response);

      const result = controller.updateUserRoles(userId, dto as any);

      expect(result).toBe(response);

      expect(usersServiceMock.updateUserRoles).toHaveBeenCalledWith(
        userId,
        dto,
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should update the profile picture', () => {
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
      } as Express.Multer.File;

      const response = {
        id: userId,
        imgUrl: 'https://cloudinary.com/avatar.png',
      };

      usersServiceMock.updateProfilePicture.mockReturnValue(response);

      const result = controller.uploadAvatar(userId, file);

      expect(result).toBe(response);

      expect(usersServiceMock.updateProfilePicture).toHaveBeenCalledWith(
        userId,
        file,
      );
    });
  });

  describe('authorization metadata', () => {
    const reflector = new Reflector();

    const getRoles = (method: keyof UsersController) => {
      return reflector.get('roles', UsersController.prototype[method]);
    };

    it('should require ADMIN and PROFESSIONAL roles for getAllUsers', () => {
      const roles = getRoles('getAllUsers');

      expect(roles).toEqual([UserRole.ADMIN, UserRole.PROFESSIONAL]);
    });

    it('should require ADMIN role for getUserById', () => {
      const roles = getRoles('getUserById');

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require CLIENT and ADMIN roles for updateUser', () => {
      const roles = getRoles('updateUser');

      expect(roles).toEqual([UserRole.CLIENT, UserRole.ADMIN]);
    });

    it('should require CLIENT, ADMIN and PROFESSIONAL roles for changePassword', () => {
      const roles = getRoles('changePassword');

      expect(roles).toEqual([
        UserRole.CLIENT,
        UserRole.ADMIN,
        UserRole.PROFESSIONAL,
      ]);
    });

    it('should require ADMIN role for removeUser', () => {
      const roles = getRoles('removeUser');

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for activateUser', () => {
      const roles = getRoles('activateUser');

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for createUserByAdmin', () => {
      const roles = getRoles('createUserByAdmin');

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for updateUserRoles', () => {
      const roles = getRoles('updateUserRoles');

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require CLIENT, ADMIN and PROFESSIONAL roles for uploadAvatar', () => {
      const roles = getRoles('uploadAvatar');

      expect(roles).toEqual([
        UserRole.CLIENT,
        UserRole.ADMIN,
        UserRole.PROFESSIONAL,
      ]);
    });

    it('should not require roles for getMyProfile', () => {
      const roles = getRoles('getMyProfile');

      expect(roles).toBeUndefined();
    });
  });
});
