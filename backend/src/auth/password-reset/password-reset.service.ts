import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { randomBytes, createHash } from 'crypto';

import { Repository } from 'typeorm';

import { PasswordResetToken } from './entities/password-reset-token.entity';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');

    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const resetToken = this.passwordResetTokenRepository.create({
      tokenHash,
      expiresAt,
      user: { id: userId },
    });

    await this.passwordResetTokenRepository.save(resetToken);

    return token;
  }
}
