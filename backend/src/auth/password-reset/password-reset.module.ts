import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { PasswordResetToken } from './entities/password-reset-token.entity';

import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [TypeOrmModule.forFeature([PasswordResetToken])],
  providers: [PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
