import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';

import { User } from 'src/users/entities/user.entity';
import { Professional } from 'src/professionals/entities/professional.entity';
import { ProfessionalService } from 'src/professionals/entities/professional-service.entity';
import { Service } from 'src/services/entities/service.entity';

import { AvailabilityModule } from 'src/availability/availability.module';

import { AppointmentOwnerOrAdminGuard } from '../auth/guards/appointment-owner-or-admin.guard';

import { OrderDetail } from 'src/orders/entities/order-detail.entity';
import { Order } from 'src/orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      User,
      Professional,
      Service,
      ProfessionalService,
      Order,
      OrderDetail,
    ]),
    AvailabilityModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsRepository,
    AppointmentOwnerOrAdminGuard,
  ],
  exports: [AppointmentsRepository],
})
export class AppointmentsModule {}