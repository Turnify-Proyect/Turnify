import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { EmailVerificationModule } from 'src/auth/email-verification/email-verification.module';
import { MailModule } from 'src/mail/mail.module';
import { PasswordResetModule } from './password-reset/password-reset.module';

@Module({
  imports: [
    UsersModule,
    EmailVerificationModule,
    MailModule,
    PasswordResetModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
