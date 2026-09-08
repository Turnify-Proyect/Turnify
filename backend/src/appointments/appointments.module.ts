import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { User } from 'src/users/entities/user.entity';
import { Professional } from 'src/professionals/entities/professional.entity';
import { ProfessionalService } from 'src/professionals/entities/professional-service.entity';
import { Service } from 'src/services/entities/service.entity';
import { Availability } from 'src/availability/entities/availability.entity';
import { AvailabilityModule } from 'src/availability/availability.module';
import { AppointmentsRepository } from './appointments.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, User, Professional, Service, ProfessionalService]), AvailabilityModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
})
export class AppointmentsModule {}
