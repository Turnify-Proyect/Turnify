import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserRole } from '../common/userRoles.enum';

describe('UsersRepository', () => {
  let repository: UsersRepository;

  const ormUsersRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new UsersRepository(
      ormUsersRepository as any,
    );
  });

  describe('getAllUsers', () => {
    it('should return paginated users without password_hash', async () => {
      const users = [
        {
          id: '1',
          name: 'Juan',
          email: 'juan@test.com',
          password_hash: 'secret',
          roles: [UserRole.CLIENT],
          isActive: true,
        },
        {
          id: '2',
          name: 'Pedro',
          email: 'pedro@test.com',
          password_hash: 'secret2',
          roles: [UserRole.ADMIN],
          isActive: true,
        },
      ];

      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          users,
          2,
        ]),
      };

      ormUsersRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await repository.getAllUsers(
        1,
        5,
      );

      expect(
        ormUsersRepository.createQueryBuilder,
      ).toHaveBeenCalledWith('user');

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'user.name',
        'ASC',
      );

      expect(result).toEqual({
        users: [
          {
            id: '1',
            name: 'Juan',
            email: 'juan@test.com',
            roles: [UserRole.CLIENT],
            isActive: true,
          },
          {
            id: '2',
            name: 'Pedro',
            email: 'pedro@test.com',
            roles: [UserRole.ADMIN],
            isActive: true,
          },
        ],
        total: 2,
        page: 1,
        limit: 5,
        totalPages: 1,
      });
    });

    it('should apply search, role and isActive filters', async () => {
      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [],
          0,
        ]),
      };

      ormUsersRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      await repository.getAllUsers(
        2,
        10,
        'juan',
        UserRole.CLIENT,
        false,
      );

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        {
          search: '%juan%',
        },
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        ':role = ANY(user.roles)',
        {
          role: UserRole.CLIENT,
        },
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.isActive = :isActive',
        {
          isActive: false,
        },
      );
    });

    it('should calculate totalPages correctly', async () => {
      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [],
          11,
        ]),
      };

      ormUsersRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await repository.getAllUsers(
        2,
        5,
      );

      expect(result.totalPages).toBe(3);
    });
  });

  describe('getUserById', () => {
    it('should return the user without password_hash', async () => {
      const user = {
        id: '1',
        name: 'Juan',
        email: 'juan@test.com',
        password_hash: 'secret',
      };

      ormUsersRepository.findOne.mockResolvedValue(user);

      const result = await repository.getUserById('1');

      expect(
        ormUsersRepository.findOne,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(result).toEqual({
        id: '1',
        name: 'Juan',
        email: 'juan@test.com',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getUserById('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserByEmail', () => {
    it('should return the user by email', async () => {
      const user = {
        id: '1',
        email: 'juan@test.com',
      };

      ormUsersRepository.findOneBy.mockResolvedValue(user);

      const result =
        await repository.getUserByEmail(
          'juan@test.com',
        );

      expect(
        ormUsersRepository.findOneBy,
      ).toHaveBeenCalledWith({
        email: 'juan@test.com',
      });

      expect(result).toEqual(user);
    });
  });

  describe('getUserByPhone', () => {
    it('should return the user by phone', async () => {
      const user = {
        id: '1',
        phone: '123456789',
      };

      ormUsersRepository.findOneBy.mockResolvedValue(user);

      const result =
        await repository.getUserByPhone(
          '123456789',
        );

      expect(
        ormUsersRepository.findOneBy,
      ).toHaveBeenCalledWith({
        phone: '123456789',
      });

      expect(result).toEqual(user);
    });
  });

  describe('createUser', () => {
    it('should create and return the user without password_hash', async () => {
      const user = {
        id: '1',
        name: 'Juan',
        email: 'juan@test.com',
        password_hash: 'hashed',
      };

      ormUsersRepository.create.mockReturnValue(
        user,
      );

      ormUsersRepository.save.mockResolvedValue(
        user,
      );

      const result =
        await repository.createUser({
          name: 'Juan',
          email: 'juan@test.com',
          password_hash: 'hashed',
        } as any);

      expect(
        ormUsersRepository.create,
      ).toHaveBeenCalledWith({
        name: 'Juan',
        email: 'juan@test.com',
        password_hash: 'hashed',
      });

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        id: '1',
        name: 'Juan',
        email: 'juan@test.com',
      });
    });
  });

  describe('updateUser', () => {
    it('should update the user successfully', async () => {
      const user = {
        id: '1',
        name: 'Juan',
        email: 'juan@test.com',
        phone: '111',
        password_hash: 'secret',
      };

      ormUsersRepository.findOneBy.mockResolvedValue(user);
      ormUsersRepository.save.mockResolvedValue(user);

      const result =
        await repository.updateUser('1', {
          name: 'Juan Actualizado',
        } as any);

      expect(
        ormUsersRepository.findOneBy,
      ).toHaveBeenCalledWith({
        id: '1',
      });

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Juan Actualizado',
        }),
      );

      expect(result).not.toHaveProperty(
        'password_hash',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.updateUser('1', {
          name: 'Juan',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email is already registered', async () => {
      const currentUser = {
        id: '1',
        email: 'old@test.com',
      };

      const otherUser = {
        id: '2',
        email: 'new@test.com',
      };

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(otherUser);

      await expect(
        repository.updateUser('1', {
          email: 'new@test.com',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when phone is already registered', async () => {
      const currentUser = {
        id: '1',
        phone: '111',
      };

      const otherUser = {
        id: '2',
        phone: '222',
      };

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(otherUser);

      await expect(
        repository.updateUser('1', {
          phone: '222',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePassword', () => {
    it('should update the password successfully', async () => {
      const user = {
        id: '1',
        password_hash: 'old-hash',
      };

      ormUsersRepository.findOneBy.mockResolvedValue(
        user,
      );

      ormUsersRepository.save.mockResolvedValue(
        user,
      );

      const result =
        await repository.updatePassword(
          '1',
          'new-hash',
        );

      expect(user.password_hash).toBe(
        'new-hash',
      );

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(result).toBe(
        'Contraseña actualizada correctamente',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.updatePassword(
          '1',
          'new-hash',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUser', () => {
    it('should deactivate an active user', async () => {
      const user = {
        id: '1',
        isActive: true,
      };

      ormUsersRepository.findOneBy.mockResolvedValue(
        user,
      );

      const result =
        await repository.removeUser('1');

      expect(user.isActive).toBe(false);

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        message:
          'Usuario desactivado correctamente',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.removeUser('1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already inactive', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        {
          id: '1',
          isActive: false,
        },
      );

      await expect(
        repository.removeUser('1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activateUser', () => {
    it('should activate an inactive user', async () => {
      const user = {
        id: '1',
        isActive: false,
      };

      ormUsersRepository.findOneBy.mockResolvedValue(
        user,
      );

      const result =
        await repository.activateUser('1');

      expect(user.isActive).toBe(true);

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        message:
          'Usuario activado correctamente',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.activateUser('1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already active', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        {
          id: '1',
          isActive: true,
        },
      );

      await expect(
        repository.activateUser('1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateUserRoles', () => {
    it('should update user roles successfully', async () => {
      const user = {
        id: '1',
        roles: [UserRole.CLIENT],
        password_hash: 'secret',
      };

      const updatedUser = {
        ...user,
        roles: [UserRole.ADMIN],
      };

      ormUsersRepository.findOneBy.mockResolvedValue(
        user,
      );

      ormUsersRepository.save.mockResolvedValue(
        updatedUser,
      );

      const result =
        await repository.updateUserRoles(
          '1',
          [UserRole.ADMIN],
        );

      expect(user.roles).toEqual([
        UserRole.ADMIN,
      ]);

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        id: '1',
        roles: [UserRole.ADMIN],
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.updateUserRoles(
          '1',
          [UserRole.ADMIN],
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfilePicture', () => {
    it('should update the profile picture successfully', async () => {
      const user = {
        id: '1',
        imgUrl: null,
        password_hash: 'secret',
      };

      const updatedUser = {
        ...user,
        imgUrl: 'https://cloudinary.com/avatar.jpg',
      };

      ormUsersRepository.findOneBy.mockResolvedValue(
        user,
      );

      ormUsersRepository.save.mockResolvedValue(
        updatedUser,
      );

      const result =
        await repository.updateProfilePicture(
          '1',
          'https://cloudinary.com/avatar.jpg',
        );

      expect(user.imgUrl).toBe(
        'https://cloudinary.com/avatar.jpg',
      );

      expect(
        ormUsersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        id: '1',
        imgUrl:
          'https://cloudinary.com/avatar.jpg',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.updateProfilePicture(
          '1',
          'https://cloudinary.com/avatar.jpg',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
