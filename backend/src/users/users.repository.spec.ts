import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { UserRole } from 'src/common/userRoles.enum';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let ormUsersRepository: jest.Mocked<Repository<User>>;

  beforeEach(() => {
    ormUsersRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    repository = new UsersRepository(ormUsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('debería devolver usuarios paginados sin password_hash', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'Juan',
          email: 'juan@test.com',
          password_hash: 'secret',
          roles: [UserRole.CLIENT],
          isActive: true,
        },
        {
          id: 'user-2',
          name: 'Pedro',
          email: 'pedro@test.com',
          password_hash: 'secret2',
          roles: [UserRole.PROFESSIONAL],
          isActive: true,
        },
      ] as User[];

      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([users, 2]),
      };

      ormUsersRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      const result = await repository.getAllUsers(1, 5);

      expect(ormUsersRepository.createQueryBuilder).toHaveBeenCalledWith(
        'user',
      );

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.name', 'ASC');

      expect(result).toEqual({
        users: [
          {
            id: 'user-1',
            name: 'Juan',
            email: 'juan@test.com',
            roles: [UserRole.CLIENT],
            isActive: true,
          },
          {
            id: 'user-2',
            name: 'Pedro',
            email: 'pedro@test.com',
            roles: [UserRole.PROFESSIONAL],
            isActive: true,
          },
        ],
        total: 2,
        page: 1,
        limit: 5,
        totalPages: 1,
      });
    });

    it('debería aplicar búsqueda, rol y estado activo', async () => {
      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      ormUsersRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      await repository.getAllUsers(
        2,
        10,
        'juan',
        UserRole.CLIENT,
        true,
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
          isActive: true,
        },
      );
    });

    it('debería calcular correctamente totalPages', async () => {
      const queryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 23]),
      };

      ormUsersRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      const result = await repository.getAllUsers(1, 5);

      expect(result.total).toBe(23);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('getUserById', () => {
    it('debería devolver el usuario sin password_hash', async () => {
      const user = {
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
        password_hash: 'hashed-password',
        roles: [UserRole.CLIENT],
      } as User;

      ormUsersRepository.findOne.mockResolvedValue(user);

      const result = await repository.getUserById('user-1');

      expect(ormUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });

      expect(result).toEqual({
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
        roles: [UserRole.CLIENT],
      });

      expect(result).not.toHaveProperty('password_hash');
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      ormUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getUserById('user-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserByEmail', () => {
    it('debería devolver el usuario encontrado', async () => {
      const user = {
        id: 'user-1',
        email: 'juan@test.com',
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);

      const result = await repository.getUserByEmail('juan@test.com');

      expect(ormUsersRepository.findOneBy).toHaveBeenCalledWith({
        email: 'juan@test.com',
      });

      expect(result).toEqual(user);
    });

    it('debería devolver null si no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.getUserByEmail('noexiste@test.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserByPhone', () => {
    it('debería buscar el usuario por teléfono', async () => {
      const user = {
        id: 'user-1',
        phone: '3415555555',
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);

      const result = await repository.getUserByPhone('3415555555');

      expect(ormUsersRepository.findOneBy).toHaveBeenCalledWith({
        phone: '3415555555',
      });

      expect(result).toEqual(user);
    });
  });

  describe('createUser', () => {
    it('debería crear y devolver el usuario sin password_hash', async () => {
      const createUserData = {
        name: 'Juan',
        email: 'juan@test.com',
        password_hash: 'hashed-password',
        roles: [UserRole.CLIENT],
      } as any;

      const createdUser = {
        id: 'user-1',
        ...createUserData,
      } as User;

      ormUsersRepository.create.mockReturnValue(createdUser);
      ormUsersRepository.save.mockResolvedValue(createdUser);

      const result = await repository.createUser(createUserData);

      expect(ormUsersRepository.create).toHaveBeenCalledWith(createUserData);
      expect(ormUsersRepository.save).toHaveBeenCalledWith(createdUser);

      expect(result).toEqual({
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
        roles: [UserRole.CLIENT],
      });

      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('updateUser', () => {
    it('debería actualizar correctamente el usuario', async () => {
      const user = {
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
        phone: '3411111111',
        password_hash: 'hashed',
      } as User;

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      ormUsersRepository.save.mockResolvedValue(user);

      const result = await repository.updateUser('user-1', {
        name: 'Juan Actualizado',
        email: 'nuevo@test.com',
        phone: '3412222222',
      });

      expect(ormUsersRepository.save).toHaveBeenCalledWith(user);

      expect(result).not.toHaveProperty('password_hash');
      expect(result.name).toBe('Juan Actualizado');
      expect(result.email).toBe('nuevo@test.com');
      expect(result.phone).toBe('3412222222');
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.updateUser('user-inexistente', {
          name: 'Nuevo nombre',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería rechazar un teléfono que ya pertenece a otro usuario', async () => {
      const currentUser = {
        id: 'user-1',
        phone: '3411111111',
      } as User;

      const anotherUser = {
        id: 'user-2',
        phone: '3412222222',
      } as User;

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(anotherUser);

      await expect(
        repository.updateUser('user-1', {
          phone: '3412222222',
        }),
      ).rejects.toThrow(ConflictException);

      expect(ormUsersRepository.findOneBy).toHaveBeenNthCalledWith(
        1,
        { id: 'user-1' },
      );

      expect(ormUsersRepository.findOneBy).toHaveBeenNthCalledWith(
        2,
        { phone: '3412222222' },
      );

      expect(ormUsersRepository.save).not.toHaveBeenCalled();
    });

    it('debería rechazar un email que ya pertenece a otro usuario', async () => {
      const currentUser = {
        id: 'user-1',
        email: 'juan@test.com',
      } as User;

      const anotherUser = {
        id: 'user-2',
        email: 'otro@test.com',
      } as User;

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(anotherUser);

      await expect(
        repository.updateUser('user-1', {
          email: 'otro@test.com',
        }),
      ).rejects.toThrow(ConflictException);

      expect(ormUsersRepository.findOneBy).toHaveBeenNthCalledWith(
        1,
        { id: 'user-1' },
      );

      expect(ormUsersRepository.findOneBy).toHaveBeenNthCalledWith(
        2,
        { email: 'otro@test.com' },
      );

      expect(ormUsersRepository.save).not.toHaveBeenCalled();
    });

    it('debería permitir mantener el mismo teléfono', async () => {
      const currentUser = {
        id: 'user-1',
        phone: '3411111111',
      } as User;

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(currentUser);

      ormUsersRepository.save.mockResolvedValue(currentUser);

      const result = await repository.updateUser('user-1', {
        phone: '3411111111',
      });

      expect(ormUsersRepository.save).toHaveBeenCalledWith(currentUser);

      expect(result.phone).toBe('3411111111');
    });

    it('debería permitir mantener el mismo email', async () => {
      const currentUser = {
        id: 'user-1',
        email: 'juan@test.com',
      } as User;

      ormUsersRepository.findOneBy
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(currentUser);

      ormUsersRepository.save.mockResolvedValue(currentUser);

      const result = await repository.updateUser('user-1', {
        email: 'juan@test.com',
      });

      expect(ormUsersRepository.save).toHaveBeenCalledWith(currentUser);

      expect(result.email).toBe('juan@test.com');
    });
  });

  describe('updatePassword', () => {
    it('debería actualizar la contraseña', async () => {
      const user = {
        id: 'user-1',
        password_hash: 'old-hash',
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);
      ormUsersRepository.save.mockResolvedValue(user);

      const result = await repository.updatePassword(
        'user-1',
        'new-hashed-password',
      );

      expect(user.password_hash).toBe('new-hashed-password');

      expect(ormUsersRepository.save).toHaveBeenCalledWith(user);
      expect(result).toBe('Contraseña actualizada correctamente');
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.updatePassword('user-inexistente', 'hash'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUser', () => {
    it('debería desactivar al usuario', async () => {
      const user = {
        id: 'user-1',
        isActive: true,
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);
      ormUsersRepository.save.mockResolvedValue(user);

      const result = await repository.removeUser('user-1');

      expect(user.isActive).toBe(false);
      expect(ormUsersRepository.save).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        message: 'Usuario desactivado correctamente',
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.removeUser('user-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería rechazar la baja si ya está inactivo', async () => {
      const user = {
        id: 'user-1',
        isActive: false,
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);

      await expect(repository.removeUser('user-1')).rejects.toThrow(
        ConflictException,
      );

      expect(ormUsersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('activateUser', () => {
    it('debería activar al usuario', async () => {
      const user = {
        id: 'user-1',
        isActive: false,
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);
      ormUsersRepository.save.mockResolvedValue(user);

      const result = await repository.activateUser('user-1');

      expect(user.isActive).toBe(true);
      expect(ormUsersRepository.save).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        message: 'Usuario activado correctamente',
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.activateUser('user-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería rechazar la activación si ya está activo', async () => {
      const user = {
        id: 'user-1',
        isActive: true,
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);

      await expect(repository.activateUser('user-1')).rejects.toThrow(
        ConflictException,
      );

      expect(ormUsersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateUserRoles', () => {
    it('debería actualizar los roles del usuario', async () => {
      const user = {
        id: 'user-1',
        roles: [UserRole.CLIENT],
        password_hash: 'secret',
      } as User;

      const updatedUser = {
        ...user,
        roles: [UserRole.PROFESSIONAL],
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);
      ormUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await repository.updateUserRoles('user-1', [
        UserRole.PROFESSIONAL,
      ]);

      expect(user.roles).toEqual([UserRole.PROFESSIONAL]);
      expect(ormUsersRepository.save).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        id: 'user-1',
        roles: [UserRole.PROFESSIONAL],
      });

      expect(result).not.toHaveProperty('password_hash');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.updateUserRoles('user-inexistente', [
          UserRole.CLIENT,
        ]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfilePicture', () => {
    it('debería actualizar la imagen de perfil', async () => {
      const user = {
        id: 'user-1',
        imgUrl: 'old-image.jpg',
        password_hash: 'secret',
      } as User;

      const updatedUser = {
        ...user,
        imgUrl: 'https://cloudinary.com/avatar.jpg',
      } as User;

      ormUsersRepository.findOneBy.mockResolvedValue(user);
      ormUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await repository.updateProfilePicture(
        'user-1',
        'https://cloudinary.com/avatar.jpg',
      );

      expect(user.imgUrl).toBe('https://cloudinary.com/avatar.jpg');
      expect(ormUsersRepository.save).toHaveBeenCalledWith(user);

      expect(result).toEqual({
        id: 'user-1',
        imgUrl: 'https://cloudinary.com/avatar.jpg',
      });

      expect(result).not.toHaveProperty('password_hash');
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      ormUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.updateProfilePicture(
          'user-inexistente',
          'https://cloudinary.com/avatar.jpg',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
