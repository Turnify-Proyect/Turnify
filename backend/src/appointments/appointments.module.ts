import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { User } from 'src/users/entities/user.entity';
import { Professional } from 'src/professionals/entities/professional.entity';
import { ProfessionalService } from 'src/professionals/entities/professional-service.entity';
import { Service } from 'src/services/entities/service.entity';
import { AvailabilityModule } from 'src/availability/availability.module';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentOwnerOrAdminGuard } from '../auth/guards/appointment-owner-or-admin.guard';
import { AppointmentCronService } from './appointment.service.cron';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      User,
      Professional,
      Service,
      ProfessionalService,
    ]),
    AvailabilityModule,
    NotificationsModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsRepository,
    AppointmentOwnerOrAdminGuard,
    AppointmentCronService,
  ],
  exports: [AppointmentsRepository],
})
export class AppointmentsModule {}
