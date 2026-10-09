import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { CloudinaryConfig } from '../config/cloudinary';
import { CloudinaryService } from '../config/cloudinary.service';
import { EmailVerificationModule } from '../auth/email-verification/email-verification.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EmailVerificationModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    CloudinaryService,
    CloudinaryConfig,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
