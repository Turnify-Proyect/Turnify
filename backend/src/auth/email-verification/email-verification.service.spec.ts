import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';

import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { User } from '../../users/entities/user.entity';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  let emailVerificationTokenRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };

  let dataSource: {
    transaction: jest.Mock;
  };

  let verificationTokenRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  let usersRepository: {
    save: jest.Mock;
  };

  beforeEach(async () => {
    emailVerificationTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    verificationTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    usersRepository = {
      save: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: getRepositoryToken(EmailVerificationToken),
          useValue: emailVerificationTokenRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVerificationToken', () => {
    it('debería crear y guardar un token de verificación', async () => {
      const userId = 'user-123';

      const createdToken = {
        tokenHash: 'hash',
        expiresAt: new Date(),
        user: {
          id: userId,
        },
      };

      emailVerificationTokenRepository.create.mockReturnValue(createdToken);
      emailVerificationTokenRepository.save.mockResolvedValue(createdToken);

      const result = await service.createVerificationToken(userId);

      expect(result).toEqual(expect.any(String));
      expect(result).toHaveLength(64);

      expect(emailVerificationTokenRepository.create).toHaveBeenCalledTimes(1);

      const createArgument =
        emailVerificationTokenRepository.create.mock.calls[0][0];

      expect(createArgument).toEqual(
        expect.objectContaining({
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          user: {
            id: userId,
          },
        }),
      );

      expect(createArgument.tokenHash).toHaveLength(64);

      expect(emailVerificationTokenRepository.save).toHaveBeenCalledWith(
        createdToken,
      );
    });

    it('debería guardar el hash SHA-256 del token y no el token original', async () => {
      const userId = 'user-123';

      const createdToken = {
        tokenHash: '',
        expiresAt: new Date(),
        user: {
          id: userId,
        },
      };

      emailVerificationTokenRepository.create.mockImplementation(
        (data) => data,
      );

      emailVerificationTokenRepository.save.mockResolvedValue(createdToken);

      const result = await service.createVerificationToken(userId);

      const createArgument =
        emailVerificationTokenRepository.create.mock.calls[0][0];

      const expectedHash = createHash('sha256').update(result).digest('hex');

      expect(createArgument.tokenHash).toBe(expectedHash);

      expect(createArgument.tokenHash).not.toBe(result);
    });

    it('debería configurar una expiración de aproximadamente 30 minutos', async () => {
      const userId = 'user-123';

      emailVerificationTokenRepository.create.mockImplementation(
        (data) => data,
      );

      emailVerificationTokenRepository.save.mockResolvedValue({});

      const before = Date.now();

      await service.createVerificationToken(userId);

      const after = Date.now();

      const createArgument =
        emailVerificationTokenRepository.create.mock.calls[0][0];

      const expiresAt = createArgument.expiresAt.getTime();

      expect(expiresAt).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);

      expect(expiresAt).toBeLessThanOrEqual(after + 30 * 60 * 1000);
    });
  });

  describe('verifyEmail', () => {
    const originalToken = 'token-original-123';

    const tokenHash = createHash('sha256').update(originalToken).digest('hex');

    const createVerificationToken = (
      overrides: Partial<EmailVerificationToken> = {},
    ) =>
      ({
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: null,
        user: {
          id: 'user-123',
          isEmailVerified: false,
        },
        ...overrides,
      }) as EmailVerificationToken;

    beforeEach(() => {
      dataSource.transaction.mockImplementation(
        async (callback: (manager: any) => Promise<void>) => {
          const manager = {
            getRepository: jest.fn((entity) => {
              if (entity === EmailVerificationToken) {
                return verificationTokenRepository;
              }

              if (entity === User) {
                return usersRepository;
              }

              throw new Error('Repositorio no esperado');
            }),
          };

          return callback(manager);
        },
      );
    });

    it('debería verificar el email correctamente', async () => {
      const verificationToken = createVerificationToken();

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      usersRepository.save.mockResolvedValue(verificationToken.user);

      verificationTokenRepository.save.mockResolvedValue(verificationToken);

      await service.verifyEmail(originalToken);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);

      expect(verificationTokenRepository.findOne).toHaveBeenCalledWith({
        where: {
          tokenHash,
        },
        relations: {
          user: true,
        },
      });

      expect(verificationToken.user.isEmailVerified).toBe(true);

      expect(usersRepository.save).toHaveBeenCalledWith(verificationToken.user);

      expect(verificationToken.usedAt).toEqual(expect.any(Date));

      expect(verificationTokenRepository.save).toHaveBeenCalledWith(
        verificationToken,
      );
    });

    it('debería buscar el token utilizando su hash SHA-256', async () => {
      const verificationToken = createVerificationToken();

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      usersRepository.save.mockResolvedValue({});
      verificationTokenRepository.save.mockResolvedValue({});

      await service.verifyEmail(originalToken);

      const findOneArgument =
        verificationTokenRepository.findOne.mock.calls[0][0];

      expect(findOneArgument.where.tokenHash).toBe(tokenHash);
    });

    it('debería lanzar BadRequestException si el token no existe', async () => {
      verificationTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(originalToken)).rejects.toThrow(
        new BadRequestException('Token de verificación inválido'),
      );

      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(verificationTokenRepository.save).not.toHaveBeenCalled();
    });

    it('debería rechazar un token que ya fue utilizado', async () => {
      const verificationToken = createVerificationToken({
        usedAt: new Date(),
      });

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      await expect(service.verifyEmail(originalToken)).rejects.toThrow(
        new BadRequestException('El token de verificación ya fue utilizado'),
      );

      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(verificationTokenRepository.save).not.toHaveBeenCalled();
    });

    it('debería rechazar un token expirado', async () => {
      const verificationToken = createVerificationToken({
        expiresAt: new Date(Date.now() - 1000),
      });

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      await expect(service.verifyEmail(originalToken)).rejects.toThrow(
        new BadRequestException('El token de verificación ha expirado'),
      );

      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(verificationTokenRepository.save).not.toHaveBeenCalled();
    });

    it('no debería guardar el usuario si falla la validación del token', async () => {
      const verificationToken = createVerificationToken({
        usedAt: new Date(),
      });

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      await expect(service.verifyEmail(originalToken)).rejects.toThrow(
        BadRequestException,
      );

      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(verificationTokenRepository.save).not.toHaveBeenCalled();
    });

    it('debería guardar primero el usuario como verificado', async () => {
      const verificationToken = createVerificationToken();

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      usersRepository.save.mockResolvedValue(verificationToken.user);

      verificationTokenRepository.save.mockResolvedValue(verificationToken);

      await service.verifyEmail(originalToken);

      const userSaveOrder = usersRepository.save.mock.invocationCallOrder[0];
      const tokenSaveOrder =
        verificationTokenRepository.save.mock.invocationCallOrder[0];

      expect(userSaveOrder).toBeLessThan(tokenSaveOrder);
    });

    it('debería marcar el token como utilizado antes de guardarlo', async () => {
      const verificationToken = createVerificationToken();

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      usersRepository.save.mockResolvedValue(verificationToken.user);

      verificationTokenRepository.save.mockImplementation(async (token) => {
        expect(token.usedAt).toEqual(expect.any(Date));
        return token;
      });

      await service.verifyEmail(originalToken);

      expect(verificationTokenRepository.save).toHaveBeenCalledTimes(1);
    });

    it('debería propagar el error si falla el guardado del usuario', async () => {
      const verificationToken = createVerificationToken();

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      const databaseError = new Error('Database error');

      usersRepository.save.mockRejectedValue(databaseError);

      await expect(service.verifyEmail(originalToken)).rejects.toThrow(
        'Database error',
      );

      expect(verificationTokenRepository.save).not.toHaveBeenCalled();
    });

    it('debería propagar el error si falla el guardado del token', async () => {
      const verificationToken = createVerificationToken();

      verificationTokenRepository.findOne.mockResolvedValue(verificationToken);

      usersRepository.save.mockResolvedValue(verificationToken.user);

      const databaseError = new Error('Database error');

      verificationTokenRepository.save.mockRejectedValue(databaseError);

      await expect(service.verifyEmail(originalToken)).rejects.toThrow(
        'Database error',
      );

      expect(usersRepository.save).toHaveBeenCalledWith(verificationToken.user);
    });
  });
});
