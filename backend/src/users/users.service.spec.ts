import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CloudinaryService } from '../config/cloudinary.service';
import { UserRole } from 'src/common/userRoles.enum';
import { AuthProvider } from '../common/authProvider.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  let usersRepository: {
    getAllUsers: jest.Mock;
    getUserById: jest.Mock;
    getUserByEmail: jest.Mock;
    getUserByPhone: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    updatePassword: jest.Mock;
    removeUser: jest.Mock;
    activateUser: jest.Mock;
    updateUserRoles: jest.Mock;
    updateProfilePicture: jest.Mock;
  };

  let cloudinaryService: {
    uploadImage: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    usersRepository = {
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

    cloudinaryService = {
      uploadImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should get all users with filters', async () => {
      const response = {
        users: [
          {
            id: 'user-1',
            name: 'Juan',
            email: 'juan@test.com',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      usersRepository.getAllUsers.mockResolvedValue(response);

      const result = await service.getAllUsers(
        1,
        10,
        'Juan',
        UserRole.CLIENT,
        true,
      );

      expect(usersRepository.getAllUsers).toHaveBeenCalledTimes(1);
      expect(usersRepository.getAllUsers).toHaveBeenCalledWith(
        1,
        10,
        'Juan',
        UserRole.CLIENT,
        true,
      );

      expect(result).toEqual(response);
    });

    it('should pass undefined filters when they are not provided', async () => {
      const response = {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      usersRepository.getAllUsers.mockResolvedValue(response);

      const result = await service.getAllUsers(1, 10);

      expect(usersRepository.getAllUsers).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(response);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      usersRepository.getAllUsers.mockRejectedValue(error);

      await expect(
        service.getAllUsers(1, 10),
      ).rejects.toThrow(error);
    });
  });

  describe('getUserById', () => {
    it('should get a user by id', async () => {
      const user = {
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
      };

      usersRepository.getUserById.mockResolvedValue(user);

      const result = await service.getUserById('user-1');

      expect(usersRepository.getUserById).toHaveBeenCalledTimes(1);
      expect(usersRepository.getUserById).toHaveBeenCalledWith('user-1');

      expect(result).toEqual(user);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('User not found');

      usersRepository.getUserById.mockRejectedValue(error);

      await expect(
        service.getUserById('user-1'),
      ).rejects.toThrow(error);
    });
  });

  describe('updateUser', () => {
    it('should update the user', async () => {
      const updateDto = {
        name: 'Juan Actualizado',
      };

      const updatedUser = {
        id: 'user-1',
        name: 'Juan Actualizado',
      };

      usersRepository.updateUser.mockResolvedValue(updatedUser);

      const result = await service.updateUser(
        'user-1',
        updateDto as any,
      );

      expect(usersRepository.updateUser).toHaveBeenCalledTimes(1);
      expect(usersRepository.updateUser).toHaveBeenCalledWith(
        'user-1',
        updateDto,
      );

      expect(result).toEqual(updatedUser);
    });

    it('should propagate repository errors', async () => {
      const error = new ConflictException(
        'El email ya esta registrado',
      );

      usersRepository.updateUser.mockRejectedValue(error);

      await expect(
        service.updateUser('user-1', {
          email: 'existing@test.com',
        } as any),
      ).rejects.toThrow(error);
    });
  });

  describe('changePassword', () => {
    it('should hash the password and update it', async () => {
      const hashedPassword = 'hashed-password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      usersRepository.updatePassword.mockResolvedValue(
        'Contraseña actualizada correctamente',
      );

      const result = await service.changePassword('user-1', {
        password: 'newPassword123',
      });

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(
        'newPassword123',
        10,
      );

      expect(usersRepository.updatePassword).toHaveBeenCalledTimes(1);
      expect(usersRepository.updatePassword).toHaveBeenCalledWith(
        'user-1',
        hashedPassword,
      );

      expect(result).toBe(
        'Contraseña actualizada correctamente',
      );
    });

    it('should not update the password if hashing fails', async () => {
      const error = new Error('Hash error');

      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      await expect(
        service.changePassword('user-1', {
          password: 'newPassword123',
        }),
      ).rejects.toThrow(error);

      expect(usersRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const hashedPassword = 'hashed-password';
      const error = new Error('Database error');

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      usersRepository.updatePassword.mockRejectedValue(error);

      await expect(
        service.changePassword('user-1', {
          password: 'newPassword123',
        }),
      ).rejects.toThrow(error);

      expect(usersRepository.updatePassword).toHaveBeenCalledWith(
        'user-1',
        hashedPassword,
      );
    });
  });

  describe('removeUser', () => {
    it('should deactivate the user', async () => {
      const response = {
        message: 'Usuario desactivado correctamente',
      };

      usersRepository.removeUser.mockResolvedValue(response);

      const result = await service.removeUser('user-1');

      expect(usersRepository.removeUser).toHaveBeenCalledTimes(1);
      expect(usersRepository.removeUser).toHaveBeenCalledWith(
        'user-1',
      );

      expect(result).toEqual(response);
    });

    it('should propagate repository errors', async () => {
      const error = new ConflictException(
        'El usuario ya se encuentra inactivo',
      );

      usersRepository.removeUser.mockRejectedValue(error);

      await expect(
        service.removeUser('user-1'),
      ).rejects.toThrow(error);
    });
  });

  describe('activateUser', () => {
    it('should activate the user', async () => {
      const response = {
        message: 'Usuario activado correctamente',
      };

      usersRepository.activateUser.mockResolvedValue(response);

      const result = await service.activateUser('user-1');

      expect(usersRepository.activateUser).toHaveBeenCalledTimes(1);
      expect(usersRepository.activateUser).toHaveBeenCalledWith(
        'user-1',
      );

      expect(result).toEqual(response);
    });

    it('should propagate repository errors', async () => {
      const error = new ConflictException(
        'El usuario ya se encuentra activo',
      );

      usersRepository.activateUser.mockRejectedValue(error);

      await expect(
        service.activateUser('user-1'),
      ).rejects.toThrow(error);
    });
  });

  describe('createUserByAdmin', () => {
    const createUserDto = {
      name: 'Juan',
      email: 'juan@test.com',
      phone: '3411111111',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      roles: [UserRole.CLIENT],
    };

    it('should create a user correctly', async () => {
      const hashedPassword = 'hashed-password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      const createdUser = {
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
        phone: '3411111111',
        roles: [UserRole.CLIENT],
      };

      usersRepository.createUser.mockResolvedValue(createdUser);

      const result = await service.createUserByAdmin(
        createUserDto as any,
      );

      expect(usersRepository.getUserByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );

      expect(usersRepository.getUserByPhone).toHaveBeenCalledWith(
        createUserDto.phone,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        10,
      );

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        name: 'Juan',
        email: 'juan@test.com',
        phone: '3411111111',
        password_hash: hashedPassword,
        roles: [UserRole.CLIENT],
        authProvider: AuthProvider.LOCAL,
        providerId: null,
      });

      expect(result).toEqual(createdUser);
    });

    it('should reject when email already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue({
        id: 'existing-user',
        email: createUserDto.email,
      });

      await expect(
        service.createUserByAdmin(createUserDto as any),
      ).rejects.toThrow(
        new ConflictException(
          'El email ya esta registrado',
        ),
      );

      expect(usersRepository.getUserByPhone).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should reject when phone already exists', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);

      usersRepository.getUserByPhone.mockResolvedValue({
        id: 'existing-user',
        phone: createUserDto.phone,
      });

      await expect(
        service.createUserByAdmin(createUserDto as any),
      ).rejects.toThrow(
        new ConflictException(
          'El telefono ya esta registrado',
        ),
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should propagate bcrypt errors', async () => {
      usersRepository.getUserByEmail.mockResolvedValue(null);
      usersRepository.getUserByPhone.mockResolvedValue(null);

      const error = new Error('Hash error');

      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      await expect(
        service.createUserByAdmin(createUserDto as any),
      ).rejects.toThrow(error);

      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('updateUserRoles', () => {
    it('should remove duplicated roles before updating', async () => {
      const currentUser = {
        id: 'user-1',
        roles: [UserRole.CLIENT],
      };

      const updatedUser = {
        id: 'user-1',
        roles: [UserRole.ADMIN],
      };

      usersRepository.getUserById.mockResolvedValue(currentUser);
      usersRepository.updateUserRoles.mockResolvedValue(updatedUser);

      const result = await service.updateUserRoles('user-1', {
        roles: [UserRole.ADMIN, UserRole.ADMIN],
      });

      expect(usersRepository.getUserById).toHaveBeenCalledWith(
        'user-1',
      );

      expect(usersRepository.updateUserRoles).toHaveBeenCalledWith(
        'user-1',
        [UserRole.ADMIN],
      );

      expect(result).toEqual(updatedUser);
    });

    it('should reject CLIENT + PROFESSIONAL', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-1',
        roles: [UserRole.CLIENT],
      });

      await expect(
        service.updateUserRoles('user-1', {
          roles: [
            UserRole.CLIENT,
            UserRole.PROFESSIONAL,
          ],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Un usuario no puede ser cliente y profesional al mismo tiempo',
        ),
      );

      expect(
        usersRepository.updateUserRoles,
      ).not.toHaveBeenCalled();
    });

    it('should reject assigning PROFESSIONAL to a non-professional user', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-1',
        roles: [UserRole.CLIENT],
      });

      await expect(
        service.updateUserRoles('user-1', {
          roles: [UserRole.PROFESSIONAL],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Para asignar el rol profesional se debe crear el perfil profesional',
        ),
      );

      expect(
        usersRepository.updateUserRoles,
      ).not.toHaveBeenCalled();
    });

    it('should allow keeping the PROFESSIONAL role', async () => {
      const currentUser = {
        id: 'user-1',
        roles: [UserRole.PROFESSIONAL],
      };

      const updatedUser = {
        id: 'user-1',
        roles: [UserRole.PROFESSIONAL],
      };

      usersRepository.getUserById.mockResolvedValue(currentUser);
      usersRepository.updateUserRoles.mockResolvedValue(updatedUser);

      const result = await service.updateUserRoles('user-1', {
        roles: [UserRole.PROFESSIONAL],
      });

      expect(usersRepository.updateUserRoles).toHaveBeenCalledWith(
        'user-1',
        [UserRole.PROFESSIONAL],
      );

      expect(result).toEqual(updatedUser);
    });

    it('should reject removing PROFESSIONAL', async () => {
      usersRepository.getUserById.mockResolvedValue({
        id: 'user-1',
        roles: [UserRole.PROFESSIONAL],
      });

      await expect(
        service.updateUserRoles('user-1', {
          roles: [UserRole.CLIENT],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'El rol profesional no puede quitarse desde la gestión de usuarios',
        ),
      );

      expect(
        usersRepository.updateUserRoles,
      ).not.toHaveBeenCalled();
    });

    it('should propagate getUserById errors', async () => {
      const error = new Error('Database error');

      usersRepository.getUserById.mockRejectedValue(error);

      await expect(
        service.updateUserRoles('user-1', {
          roles: [UserRole.CLIENT],
        }),
      ).rejects.toThrow(error);

      expect(
        usersRepository.updateUserRoles,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateProfilePicture', () => {
    const file = {
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    it('should upload the image and update the profile', async () => {
      const cloudinaryResult = {
        secure_url: 'https://cloudinary.com/avatar.jpg',
      };

      const updatedUser = {
        id: 'user-1',
        imgUrl: cloudinaryResult.secure_url,
      };

      cloudinaryService.uploadImage.mockResolvedValue(
        cloudinaryResult,
      );

      usersRepository.updateProfilePicture.mockResolvedValue(
        updatedUser,
      );

      const result = await service.updateProfilePicture(
        'user-1',
        file,
      );

      expect(
        cloudinaryService.uploadImage,
      ).toHaveBeenCalledTimes(1);

      expect(
        cloudinaryService.uploadImage,
      ).toHaveBeenCalledWith(
        file,
        'turnify/users',
      );

      expect(
        usersRepository.updateProfilePicture,
      ).toHaveBeenCalledWith(
        'user-1',
        cloudinaryResult.secure_url,
      );

      expect(result).toEqual(updatedUser);
    });

    it('should propagate Cloudinary errors', async () => {
      const error = new Error('Cloudinary error');

      cloudinaryService.uploadImage.mockRejectedValue(error);

      await expect(
        service.updateProfilePicture('user-1', file),
      ).rejects.toThrow(error);

      expect(
        usersRepository.updateProfilePicture,
      ).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const cloudinaryResult = {
        secure_url: 'https://cloudinary.com/avatar.jpg',
      };

      const error = new Error('Database error');

      cloudinaryService.uploadImage.mockResolvedValue(
        cloudinaryResult,
      );

      usersRepository.updateProfilePicture.mockRejectedValue(
        error,
      );

      await expect(
        service.updateProfilePicture('user-1', file),
      ).rejects.toThrow(error);

      expect(
        usersRepository.updateProfilePicture,
      ).toHaveBeenCalledWith(
        'user-1',
        cloudinaryResult.secure_url,
      );
    });
  });
});
