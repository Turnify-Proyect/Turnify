import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Put,
  ParseUUIDPipe,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from './entities/appointment.entity';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { AppointmentOwnerOrAdminGuard } from '../auth/guards/appointment-owner-or-admin.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener todas las citas (Solo Administradores y Profesionales)',
    description:
      'Devuelve una lista completa y cronológica de todas las citas registradas en el sistema. Actualiza automáticamente las citas pendientes expiradas antes de retornar la información. Solo accesible para usuarios con rol de administrador o profesional.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de citas obtenida con éxito junto con sus relaciones de usuario, profesionales, servicios y pagos.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMIN o PROFESSIONAL (ej. un CLIENT).',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la expiración automática o al realizar el mapeo de relaciones en la base de datos.',
  })
  getAllAppointments() {
    return this.appointmentsService.getAllAppointments();
  }

  @Get('me')
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener los turnos del usuario autenticado',
    description:
      'Devuelve la lista de turnos del usuario correspondiente al token JWT enviado en la cabecera Authorization. No requiere enviar el ID del usuario por parámetro.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de turnos del usuario autenticado devuelta con éxito junto con sus relaciones.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de CLIENT (ej. un ADMIN o PROFESSIONAL).',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: El usuario está autenticado pero su ID no existe en la base de datos.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la expiración automática o consultar los registros.',
  })
  getMyAppointments(@Req() req: any) {
    return this.appointmentsService.getAppointmentsByUserId(req.user.id);
  }

  @Get('available-slots')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtener los turnos disponibles para un profesional y servicio en una fecha específica',
    description:
      'Calcula dinámicamente las franjas horarias libres cruzando la agenda semanal del profesional, sus bloqueos por inasistencia y las citas ya ocupadas (confirmadas o pendientes sin expirar). Solo accesible para clientes o administradores.',
  })
  @ApiQuery({
    name: 'professionalId',
    required: true,
    type: String,
    description: 'ID del profesional en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'serviceId',
    required: true,
    type: String,
    description: 'ID del servicio a agendar en formato UUID',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    type: String,
    description: 'Fecha a consultar en formato YYYY-MM-DD',
    example: '2026-10-15',
  })
  @ApiQuery({
    name: 'appointmentId',
    required: false,
    type: String,
    description:
      'ID del turno actual a ignorar (útil para omitir el bloqueo del propio turno durante una reprogramación)',
    example: 'b5c6d7e8-9012-3456-789a-bcdef0123456',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de franjas horarias (slots) disponibles devuelta exitosamente (puede retornar un arreglo vacío si el día está lleno o el profesional tiene el día bloqueado).',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Los identificadores no son UUID válidos o el formato de la fecha provista no es válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de CLIENT o ADMIN (ej. un PROFESSIONAL).',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: El profesional seleccionado o el servicio provisto no existen en el sistema.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El profesional o servicio están inactivos, o el profesional no está capacitado para realizar dicho servicio.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la expiración o calcular las franjas horarias con el QueryBuilder.',
  })
  getAvailableSlots(
    @Query('professionalId', ParseUUIDPipe)
    professionalId: string,

    @Query('serviceId', ParseUUIDPipe)
    serviceId: string,

    @Query('date')
    date: string,

    @Query('appointmentId')
    appointmentId?: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      professionalId,
      serviceId,
      date,
      appointmentId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener una cita por ID',
    description:
      'Devuelve la información detallada de una cita específica según su ID. Actualiza automáticamente el estado de las citas vencidas antes de procesar la búsqueda. Solo accesible para usuarios con rol de administrador, profesional o cliente.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'Cita encontrada y devuelta con éxito junto con su metadata relacional.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no cuenta con un rol válido asignado en el sistema.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún turno registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la expiración automática o consultar los registros.',
  })
  getAppointmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener citas por ID de usuario',
    description:
      'Devuelve la lista completa y cronológica de citas asociadas a un usuario específico según su ID. Actualiza automáticamente las citas pendientes expiradas antes de procesar la búsqueda. Solo accesible para usuarios con rol de administrador.',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'ID del usuario a consultar en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'Historial de citas del usuario devuelto exitosamente junto con su metadata relacional.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El userId enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún usuario registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la expiración automática o consultar los registros.',
  })
  getAppointmentsByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.appointmentsService.getAppointmentsByUserId(userId);
  }

  @Get('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener citas por ID de profesional',
    description:
      'Devuelve la lista completa y cronológica de citas asociadas a un profesional específico según su ID. Actualiza automáticamente las citas pendientes expiradas antes de procesar la búsqueda. Solo accesible para usuarios con rol de administrador o profesional.',
  })
  @ApiParam({
    name: 'professionalId',
    required: true,
    description: 'ID del profesional a consultar en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'Historial de citas del profesional devuelto exitosamente junto con su metadata relacional.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMIN o PROFESSIONAL (ej. un CLIENT).',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún profesional registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la expiración automática o consultar los registros.',
  })
  getAppointmentsByProfessionalId(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.appointmentsService.getAppointmentsByProfessionalId(
      professionalId,
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard, AppointmentOwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancelar un turno existente',
    description:
      'Cambia el estado de una cita a CANCELLED y libera el espacio. Valida que el turno exista, que su fecha no haya pasado y que no se encuentre en un estado irreversible (completado, expirado o cancelado previamente). Solo accesible por el propietario del turno o un administrador.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID del turno a cancelar en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'El turno ha sido cancelado exitosamente y se procesó el envío de la notificación por correo.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID provisto en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o intentó cancelar un turno ajeno sin privilegios de Administrador.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún turno registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El turno ya se encuentra cancelado, completado, expirado, o su horario de inicio ya ha pasado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  cancelAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.cancelAppointment(id);
  }

  @Put(':id/reschedule')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard, AppointmentOwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reprogramar un turno existente',
    description:
      'Permite modificar la fecha, el profesional o el servicio de una cita activa. Aplica restricciones estrictas de negocio: máximo 2 reprogramaciones por cita, rango mínimo de 24 horas de anticipación y validación de disponibilidad sin superposiciones en las agendas. Solo accesible por el propietario del turno o un administrador.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita a reprogramar en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'Turno reprogramado correctamente y notificación por correo electrónico enviada al cliente de manera asíncrona.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID no es un UUID válido, o el cuerpo de la solicitud se encuentra vacío o mal estructurado.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o intentó reprogramar un turno de otro cliente sin autorización.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: La cita especificada no existe (o no es editable), o el nuevo profesional/servicio provisto no figuran en el sistema.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: Se alcanzó el límite de cambios, las entidades están inactivas, la fecha es inválida o en el pasado, hay menos de 24 horas de anticipación, o se detectaron superposiciones de agenda.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  rescheduleAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rescheduleAppointmentDto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleAppointment(
      id,
      rescheduleAppointmentDto,
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marcar un turno como completado',
    description:
      'Cambia el estado de una cita confirmada a COMPLETED. Valida que el turno exista, que ya haya comenzado y que pertenezca al profesional autenticado (los administradores pueden completar cualquier turno). Solo accesible para usuarios con rol de administrador o profesional.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita a completar en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'El turno ha sido marcado como completado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID provisto en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o es un profesional que intentó modificar un turno asignado a otro colega.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún turno registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El turno no se encuentra en estado CONFIRMED o se intentó completar antes de su fecha y hora de inicio.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  completeAppointment(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.appointmentsService.completeAppointment(
      id,
      req.user.id,
      req.user.roles,
    );
  }

  @Patch(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marcar un turno como ausente (no show)',
    description:
      'Cambia el estado de una cita confirmada a NO_SHOW. Valida que el turno exista, que su hora de inicio ya haya pasado y que pertenezca al profesional autenticado (los administradores pueden modificar cualquier turno). Solo accesible para usuarios con rol de administrador o profesional.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita a marcar como ausente en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'El turno ha sido marcado como ausente (no show) exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID provisto en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o es un profesional que intentó modificar un turno asignado a otro colega.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún turno registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El turno no se encuentra en estado CONFIRMED o se intentó marcar como ausente antes de su fecha y hora de inicio.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  markAppointmentNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.appointmentsService.markAppointmentNoShow(
      id,
      req.user.id,
      req.user.roles,
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar el estado de un turno (Fuerza Bruta de Administrador)',
    description:
      'Permite a un administrador forzar manualmente la transición de estado de una cita. Valida la coherencia de la transición y limpia los tiempos de expiración si deja de estar en estado PENDING. Si el nuevo estado es CONFIRMED, procesa de forma asíncrona la notificación por correo electrónico.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita a modificar en formato UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(AppointmentStatus),
          description: 'Nuevo estado de la cita a asignar de forma manual',
          example: 'CONFIRMED',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Estado del turno actualizado exitosamente y notificación procesada si correspondía.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID no es un UUID válido o el estado provisto no pertenece al catálogo de estados permitidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún turno registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: La transición de estado solicitada no es válida según las reglas de negocio del sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización o guardar en la base de datos.',
  })
  updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') newStatus: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, newStatus);
  }
}
