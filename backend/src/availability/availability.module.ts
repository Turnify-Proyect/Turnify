import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Availability } from './entities/availability.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from 'src/professionals/entities/professional.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Availability, Professional])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
