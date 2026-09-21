import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { EmailVerificationModule } from 'src/auth/email-verification/email-verification.module';
import { MailModule } from 'src/mail/mail.module';

// Quité el JwtModule.register, que se estaba duplicando con app.module
//coemntado por:Lautaro-dev
@Module({
  imports: [UsersModule, EmailVerificationModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
