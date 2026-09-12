import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { UserRole } from '../../common/userRoles.enum';

@Injectable()
export class AppointmentOwnerOrAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  //Paea evitar que un cliente autenticado pueda cambiar el ID de la URL y cancelar el turno de otra persona.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const appointmentId = request.params.id;

    const isAdmin = user.roles.includes(UserRole.ADMIN);

    if (isAdmin) {
      return true;
    }

    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId },
      relations: {
        user: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    const isOwner = appointment.user.id === user.id;

    if (!isOwner) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este turno',
      );
    }

    return true;
  }
}