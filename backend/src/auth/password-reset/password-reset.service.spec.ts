jest.mock('bcrypt', () => ({
hash: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';

describe('PasswordResetService', () => {
let service: PasswordResetService;

let passwordResetTokenRepository: {
create: jest.Mock;
save: jest.Mock;
findOne: jest.Mock;
manager: {
save: jest.Mock;
};
};

beforeEach(async () => {
passwordResetTokenRepository = {
create: jest.fn(),
save: jest.fn(),
findOne: jest.fn(),
manager: {
save: jest.fn(),
},
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    PasswordResetService,
    {
      provide: getRepositoryToken(PasswordResetToken),
      useValue: passwordResetTokenRepository,
    },
  ],
}).compile();

service = module.get<PasswordResetService>(PasswordResetService);

(bcrypt.hash as jest.Mock).mockReset();


});

afterEach(() => {
jest.clearAllMocks();
});

describe('createPasswordResetToken', () => {
it('should create and save a password reset token', async () => {
const userId = 'user-123';

  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    user: {
      id: userId,
    },
  };

  passwordResetTokenRepository.create.mockReturnValue(resetToken);
  passwordResetTokenRepository.save.mockResolvedValue(resetToken);

  const result = await service.createPasswordResetToken(userId);

  expect(result).toEqual(expect.any(String));
  expect(result).toHaveLength(64);

  expect(passwordResetTokenRepository.create).toHaveBeenCalledTimes(1);

  expect(passwordResetTokenRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      tokenHash: expect.any(String),
      expiresAt: expect.any(Date),
      user: {
        id: userId,
      },
    }),
  );

  expect(passwordResetTokenRepository.save).toHaveBeenCalledTimes(1);
  expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(
    resetToken,
  );
});

it('should generate different tokens on different calls', async () => {
  const userId = 'user-123';

  passwordResetTokenRepository.create.mockImplementation((data) => data);
  passwordResetTokenRepository.save.mockResolvedValue(undefined);

  const firstToken = await service.createPasswordResetToken(userId);
  const secondToken = await service.createPasswordResetToken(userId);

  expect(firstToken).not.toBe(secondToken);

  expect(passwordResetTokenRepository.create).toHaveBeenCalledTimes(2);
  expect(passwordResetTokenRepository.save).toHaveBeenCalledTimes(2);
});

it('should associate the token with the provided user', async () => {
  const userId = 'user-456';

  passwordResetTokenRepository.create.mockImplementation((data) => data);
  passwordResetTokenRepository.save.mockResolvedValue(undefined);

  await service.createPasswordResetToken(userId);

  expect(passwordResetTokenRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      user: {
        id: userId,
      },
    }),
  );
});

it('should set an expiration approximately 30 minutes in the future', async () => {
  const userId = 'user-123';

  passwordResetTokenRepository.create.mockImplementation((data) => data);
  passwordResetTokenRepository.save.mockResolvedValue(undefined);

  const before = Date.now();

  await service.createPasswordResetToken(userId);

  const after = Date.now();

  const createCall =
    passwordResetTokenRepository.create.mock.calls[0][0];

  const expiresAt = createCall.expiresAt.getTime();

  expect(expiresAt).toBeGreaterThanOrEqual(
    before + 30 * 60 * 1000,
  );

  expect(expiresAt).toBeLessThanOrEqual(
    after + 30 * 60 * 1000,
  );
});

it('should propagate repository errors when saving the token', async () => {
  const repositoryError = new Error('Database error');

  passwordResetTokenRepository.create.mockImplementation((data) => data);
  passwordResetTokenRepository.save.mockRejectedValue(repositoryError);

  await expect(
    service.createPasswordResetToken('user-123'),
  ).rejects.toThrow(repositoryError);
});


});

describe('resetPassword', () => {
const validToken = 'a'.repeat(64);

it('should reset the password successfully', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

  passwordResetTokenRepository.manager.save.mockResolvedValue(
    resetToken.user,
  );

  passwordResetTokenRepository.save.mockResolvedValue(resetToken);

  const result = await service.resetPassword(
    validToken,
    'NewPassword123!',
  );

  expect(result).toBe('Contraseña actualizada correctamente');

  expect(bcrypt.hash).toHaveBeenCalledTimes(1);
  expect(bcrypt.hash).toHaveBeenCalledWith(
    'NewPassword123!',
    10,
  );

  expect(resetToken.user.password_hash).toBe(
    'new-password-hash',
  );

  expect(passwordResetTokenRepository.manager.save).toHaveBeenCalledWith(
    resetToken.user,
  );

  expect(resetToken.usedAt).toEqual(expect.any(Date));

  expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(
    resetToken,
  );
});

it('should reject an invalid token', async () => {
  passwordResetTokenRepository.findOne.mockResolvedValue(null);

  await expect(
    service.resetPassword(validToken, 'NewPassword123!'),
  ).rejects.toThrow(
    new BadRequestException(
      'El token de recuperación no es válido',
    ),
  );

  expect(bcrypt.hash).not.toHaveBeenCalled();
  expect(
    passwordResetTokenRepository.manager.save,
  ).not.toHaveBeenCalled();

  expect(passwordResetTokenRepository.save).not.toHaveBeenCalled();
});

it('should reject a token that has already been used', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: new Date(),
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  await expect(
    service.resetPassword(validToken, 'NewPassword123!'),
  ).rejects.toThrow(
    new BadRequestException(
      'El token de recuperación ya fue utilizado',
    ),
  );

  expect(bcrypt.hash).not.toHaveBeenCalled();
  expect(
    passwordResetTokenRepository.manager.save,
  ).not.toHaveBeenCalled();

  expect(passwordResetTokenRepository.save).not.toHaveBeenCalled();
});

it('should reject an expired token', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() - 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  await expect(
    service.resetPassword(validToken, 'NewPassword123!'),
  ).rejects.toThrow(
    new BadRequestException(
      'El token de recuperación ha expirado',
    ),
  );

  expect(bcrypt.hash).not.toHaveBeenCalled();
  expect(
    passwordResetTokenRepository.manager.save,
  ).not.toHaveBeenCalled();

  expect(passwordResetTokenRepository.save).not.toHaveBeenCalled();
});

it('should search the token using its hash and load the user relation', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

  passwordResetTokenRepository.manager.save.mockResolvedValue(
    resetToken.user,
  );

  passwordResetTokenRepository.save.mockResolvedValue(resetToken);

  await service.resetPassword(
    validToken,
    'NewPassword123!',
  );

  expect(passwordResetTokenRepository.findOne).toHaveBeenCalledTimes(1);

  expect(passwordResetTokenRepository.findOne).toHaveBeenCalledWith({
    where: {
      tokenHash: expect.any(String),
    },
    relations: {
      user: true,
    },
  });
});

it('should mark the token as used after changing the password', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

  passwordResetTokenRepository.manager.save.mockResolvedValue(
    resetToken.user,
  );

  passwordResetTokenRepository.save.mockResolvedValue(resetToken);

  await service.resetPassword(
    validToken,
    'NewPassword123!',
  );

  expect(resetToken.usedAt).toEqual(expect.any(Date));

  expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(
    resetToken,
  );
});

it('should propagate bcrypt errors', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  const bcryptError = new Error('Hashing failed');

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  (bcrypt.hash as jest.Mock).mockRejectedValue(bcryptError);

  await expect(
    service.resetPassword(
      validToken,
      'NewPassword123!',
    ),
  ).rejects.toThrow(bcryptError);

  expect(
    passwordResetTokenRepository.manager.save,
  ).not.toHaveBeenCalled();

  expect(passwordResetTokenRepository.save).not.toHaveBeenCalled();
});

it('should propagate errors when saving the updated user', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  const saveError = new Error('Could not save user');

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

  passwordResetTokenRepository.manager.save.mockRejectedValue(
    saveError,
  );

  await expect(
    service.resetPassword(
      validToken,
      'NewPassword123!',
    ),
  ).rejects.toThrow(saveError);

  expect(passwordResetTokenRepository.save).not.toHaveBeenCalled();
});

it('should propagate errors when marking the token as used', async () => {
  const resetToken = {
    id: 'reset-token-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    user: {
      id: 'user-123',
      password_hash: 'old-password-hash',
    },
  };

  const saveError = new Error('Could not save reset token');

  passwordResetTokenRepository.findOne.mockResolvedValue(resetToken);

  (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

  passwordResetTokenRepository.manager.save.mockResolvedValue(
    resetToken.user,
  );

  passwordResetTokenRepository.save.mockRejectedValue(saveError);

  await expect(
    service.resetPassword(
      validToken,
      'NewPassword123!',
    ),
  ).rejects.toThrow(saveError);

  expect(resetToken.user.password_hash).toBe(
    'new-password-hash',
  );

  expect(resetToken.usedAt).toEqual(expect.any(Date));
});


});
});