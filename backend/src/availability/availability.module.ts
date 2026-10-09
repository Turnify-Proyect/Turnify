import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityRepository } from './availability.repository';
import { Availability } from './entities/availability.entity';

import { Professional } from '../professionals/entities/professional.entity';
import { ProfessionalsModule } from '../professionals/professionals.module';

import { ProfessionalUnavailability } from './entities/professional-unavailability.entity';
import { ProfessionalUnavailabilityRepository } from './professional-unavailability.repository';
import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { ProfessionalUnavailabilityController } from './professional-unavailability.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Availability,
      Professional,
      ProfessionalUnavailability,
    ]),
    ProfessionalsModule,
  ],
  controllers: [AvailabilityController, ProfessionalUnavailabilityController],
  providers: [
    AvailabilityService,
    AvailabilityRepository,
    ProfessionalUnavailabilityService,
    ProfessionalUnavailabilityRepository,
  ],
  exports: [AvailabilityRepository, ProfessionalUnavailabilityRepository],
})
export class AvailabilityModule {}
