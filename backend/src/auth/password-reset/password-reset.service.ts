import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { randomBytes, createHash } from 'crypto';

import { Repository } from 'typeorm';

import { PasswordResetToken } from './entities/password-reset-token.entity';

import * as bcrypt from 'bcrypt';

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

  private async validatePasswordResetToken(
    token: string,
  ): Promise<PasswordResetToken> {
    const tokenHash = this.hashToken(token);

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('El token de recuperación no es válido');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException(
        'El token de recuperación ya fue utilizado',
      );
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('El token de recuperación ha expirado');
    }

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<string> {
    const resetToken = await this.validatePasswordResetToken(token);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    resetToken.user.password_hash = hashedPassword;

    await this.passwordResetTokenRepository.manager.save(resetToken.user);

    resetToken.usedAt = new Date();

    await this.passwordResetTokenRepository.save(resetToken);

    return 'Contraseña actualizada correctamente';
  }
}
