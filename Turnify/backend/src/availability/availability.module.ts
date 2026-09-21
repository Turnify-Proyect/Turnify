import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityRepository } from './availability.repository';
import { Availability } from './entities/availability.entity';
import { Professional } from '../professionals/entities/professional.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Availability, Professional])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository],
  exports: [AvailabilityRepository],
})
export class AvailabilityModule {}
