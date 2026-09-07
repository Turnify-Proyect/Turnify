import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalService } from './entities/professional-service.entity';
import { Professional } from './entities/professional.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { ProfessionalsRepository } from './professionals.repository';
import { Service } from 'src/services/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Professional, ProfessionalService, User, Service])],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, ProfessionalsRepository],
})
export class ProfessionalsModule {}
