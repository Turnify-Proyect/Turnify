import { BadRequestException, ConflictException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { UserRole } from '../common/userRoles.enum';
import { AuthProvider } from '../common/authProvider.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = {
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserByPhone: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    updatePassword: jest.fn(),
    removeUser: jest.fn(),
    activateUser: jest.fn(),
    updateUserRoles: jest.fn(),
    updateProfilePicture: jest.fn(),
  };

  const cloudinaryService = {
    uploadImage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new UsersService(
      usersRepository as any,
      cloudinaryService as any,
    );

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('getAllUsers', () => {
    it('should call repository with all filters', async () => {
      const expected = {
        users: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      };

      usersRepository.getAllUsers.mockResolvedValue(expected);

      const result = await service.getAllUsers(
        1,
        5,
        'juan',
        UserRole.CLIENT,
        true,
      );

      expect(usersRepository.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        'juan',
        UserRole.CLIENT,
        true,
      );

      expect(result).toEqual(expected);
    });

    it('should call repository without optional filters', async () => {
      usersRepository.getAllUsers.mockResolvedValue([]);

      await service.getAllUsers(1, 5);

      expect(usersRepository.getAllUsers).toHaveBeenCalledWith(
        1,
        5,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('getUserById', () => {
    it('should return the user from repository', async () => {
      const user = {
        id: 'user-id',
        name: 'Juan',
      };

      usersRepository.getUserById.mockResolvedValue(user);

      const result = await service.getUserById('user-id');

      expect(usersRepository.getUserById).toHaveBeenCalledWith('user-id');

      expect(result).toEqual(user);
    });
  });

  describe('updateUser', () => {
    it('should call repository with the user data', async () => {
      const dto = {
        name: 'Juan actualizado',
      };

      const expected = {
        id: 'user-id',
        name: 'Juan actualizado',
      };

      usersRepository.updateUser.mockResolvedValue(expected);

      const result = await service.updateUser('user-id', dto as any);

      expect(usersRepository.updateUser).toHaveBeenCalledWith('user-id', dto);

      expect(result).toEqual(expected);
    });
  });

  describe('changePassword', () => {
    it('should hash the password and update it', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      usersRepository.updatePassword.mockResolvedValue(
        'Contraseña actualizada correctamente',
      );

      const dto = {
        password: 'NewPassword123!',
      };

      const result = await service.changePassword('user-id', dto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);

      expect(usersRepository.updatePassword).toHaveBeenCalledWith(
        'user-id',
        'hashed-password',
      );

      expect(result).toBe('Contraseña actualizada correctamente');
    });
  });

  describe('removeUser', () => {
    it('should call repository removeUser', async () => {
      const expected = {
        message: 'Usuario desactivado correctamente',
      };

      usersRepository.removeUser.mockResolvedValue(expected);

      const result = await service.removeUser('user-id');

      expect(usersRepository.removeUser).toHaveBeenCalledWith('user-id');

      expect(result).toEqual(expected);
    });
  });

  describe('activateUser', () => {
    it('should call repository activateUser', async () => {
      const expected = {
        message: 'Usuario activado correctamente',
      };

      usersRepository.activateUser.mockResolvedValue(expected);

      const result = await service.activateUser('user-id');

      expect(usersRepository.activateUser).toHaveBeenCalledWith('user-id');

      expect(result).toEqual(expected);
    });
  });

  describe('createUserByAdmin', () => {
    const dto = {
      name: 'Juan',
      email: 'juan@test.com',
      phone: '123456789',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      roles: [UserRole.CLIENT],
    };

    it('should create a user successfully', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);

      usersRepository.getUserByPhone.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const expected = {
        id: 'user-id',
        name: 'Juan',
        email: 'juan@test.com',
        phone: '123456789',
        roles: [UserRole.CLIENT],
      };

      usersRepository.createUser.mockResolvedValue(expected);

      const result = await service.createUserByAdmin(dto as any);

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        'juan@test.com',
      );

      expect(usersRepository.getUserByPhone).toHaveBeenCalledWith('123456789');

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        name: 'Juan',
        email: 'juan@test.com',
        phone: '123456789',
        password_hash: 'hashed-password',
        roles: [UserRole.CLIENT],
        authProvider: AuthProvider.LOCAL,
        providerId: null,
      });

      expect(result).toEqual(expected);
    });

    it('should throw ConflictException when email already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'existing-user',
        email: 'juan@test.com',
      });

      await expect(service.createUserByAdmin(dto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(usersRepository.getUserByPhone).not.toHaveBeenCalled();

      expect(usersRepository.createUser).not.toHaveBeenCalled();

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when phone already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);

      usersRepository.getUserByPhone.mockResolvedValue({
        id: 'existing-user',
        phone: '123456789',
      });

      await expect(service.createUserByAdmin(dto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(usersRepository.createUser).not.toHaveBeenCalled();

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('updateUserRoles', () => {
    it('should remove duplicated roles before validation', async () => {
      const currentUser = {
        id: 'user-id',
        roles: [UserRole.ADMIN],
      };

      usersRepository.getUserById.mockResolvedValue(currentUser);

      usersRepository.updateUserRoles.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.ADMIN],
      });

      await service.updateUserRoles('user-id', {
        roles: [UserRole.ADMIN, UserRole.ADMIN],
      } as any);

      expect(usersRepository.updateUserRoles).toHaveBeenCalledWith('user-id', [
        UserRole.ADMIN,
      ]);
    });

    it('should throw BadRequestException when user has CLIENT and PROFESSIONAL roles', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.ADMIN],
      });

      await expect(
        service.updateUserRoles('user-id', {
          roles: [UserRole.CLIENT, UserRole.PROFESSIONAL],
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(usersRepository.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when assigning PROFESSIONAL to a non-professional user', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.ADMIN],
      });

      await expect(
        service.updateUserRoles('user-id', {
          roles: [UserRole.PROFESSIONAL],
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(usersRepository.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when removing PROFESSIONAL role', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.PROFESSIONAL],
      });

      await expect(
        service.updateUserRoles('user-id', {
          roles: [UserRole.ADMIN],
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(usersRepository.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should update roles when the new roles are valid', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.ADMIN],
      });

      const expected = {
        id: 'user-id',
        roles: [UserRole.ADMIN],
      };

      usersRepository.updateUserRoles.mockResolvedValue(expected);

      const result = await service.updateUserRoles('user-id', {
        roles: [UserRole.ADMIN],
      } as any);

      expect(usersRepository.updateUserRoles).toHaveBeenCalledWith('user-id', [
        UserRole.ADMIN,
      ]);

      expect(result).toEqual(expected);
    });

    it('should allow an existing professional to keep the PROFESSIONAL role', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.PROFESSIONAL],
      });

      usersRepository.updateUserRoles.mockResolvedValue({
        id: 'user-id',
        roles: [UserRole.PROFESSIONAL, UserRole.ADMIN],
      });

      const result = await service.updateUserRoles('user-id', {
        roles: [UserRole.PROFESSIONAL, UserRole.ADMIN],
      } as any);

      expect(usersRepository.updateUserRoles).toHaveBeenCalledWith('user-id', [
        UserRole.PROFESSIONAL,
        UserRole.ADMIN,
      ]);

      expect(result).toEqual({
        id: 'user-id',
        roles: [UserRole.PROFESSIONAL, UserRole.ADMIN],
      });
    });
  });

  describe('updateProfilePicture', () => {
    it('should upload the image to Cloudinary and update the user', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      cloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/avatar.jpg',
      });

      const expected = {
        id: 'user-id',
        imgUrl: 'https://cloudinary.com/avatar.jpg',
      };

      usersRepository.updateProfilePicture.mockResolvedValue(expected);

      const result = await service.updateProfilePicture('user-id', file);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        file,
        'turnify/users',
      );

      expect(usersRepository.updateProfilePicture).toHaveBeenCalledWith(
        'user-id',
        'https://cloudinary.com/avatar.jpg',
      );

      expect(result).toEqual(expected);
    });

    it('should propagate Cloudinary errors', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      cloudinaryService.uploadImage.mockRejectedValue(
        new Error('Cloudinary error'),
      );

      await expect(
        service.updateProfilePicture('user-id', file),
      ).rejects.toThrow('Cloudinary error');

      expect(usersRepository.updateProfilePicture).not.toHaveBeenCalled();
    });
  });
});
