import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,

    private readonly dataSource: DataSource,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private validateVerificationToken(
    verificationToken: EmailVerificationToken,
  ): void {
    if (verificationToken.usedAt) {
      throw new BadRequestException(
        'El token de verificación ya fue utilizado',
      );
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('El token de verificación ha expirado');
    }
  }

  async createVerificationToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');

    const tokenHash = this.hashToken(token);

    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const verificationToken = this.emailVerificationTokenRepository.create({
      tokenHash,
      expiresAt,
      user: {
        id: userId,
      },
    });

    await this.emailVerificationTokenRepository.save(verificationToken);

    return token;
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.dataSource.transaction(async (manager) => {
      const verificationTokenRepository = manager.getRepository(
        EmailVerificationToken,
      );

      const usersRepository = manager.getRepository(User);

      const verificationToken = await verificationTokenRepository.findOne({
        where: { tokenHash },
        relations: {
          user: true,
        },
      });

      if (!verificationToken) {
        throw new BadRequestException('Token de verificación inválido');
      }

      this.validateVerificationToken(verificationToken);

      verificationToken.user.isEmailVerified = true;

      await usersRepository.save(verificationToken.user);

      verificationToken.usedAt = new Date();

      await verificationTokenRepository.save(verificationToken);
    });
  }
}
