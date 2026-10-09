import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';
import { CreateOrderResponseDto } from './dto/create-order-response.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
   @ApiOperation({
    summary: 'Crear una orden de compra y reservar temporalmente múltiples turnos',
    description:
      'Registra de forma atómica una orden con su detalle de facturación totalizado y bloquea los turnos en estado PENDING con una ventana de expiración fija de 10 minutos. Valida la disponibilidad horaria contra la base de datos y evita superposiciones internas en la misma petición. El turno se confirma únicamente tras procesar el pago.',
  })
  @ApiResponse({ status: 201, description: 'Orden registrada y bloqueos temporales de turnos generados correctamente.', })
  @ApiResponse({ status: 400, description: 'Petición inválida: El cuerpo de la solicitud está malformado, el arreglo de turnos está vacío, los IDs no son UUID válidos o la fecha no cumple el formato ISO.',})
  @ApiResponse({ status: 401, description: 'No autorizado: Token no enviado, inválido o expirado.', })
  @ApiResponse({ status: 403, description: 'Prohibido: El usuario autenticado no posee el rol de CLIENT (ej. un ADMIN o PROFESSIONAL).', })
  @ApiResponse({ status: 409, description: 'Conflicto: El profesional o el usuario no se encuentran disponibles, se detectaron superposiciones de turnos dentro de la misma solicitud, o el precio final no pudo ser calculado.',})
  @ApiResponse({ status: 500, description: 'Error interno del servidor al procesar el bloque transaccional o persistir las entidades concurrentemente.',})
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }



  @Post('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear una orden de compra para un cliente desde administración (Solo Administradores)',
    description:
      'Registra de forma atómica una orden asignada manualmente a un cliente específico y genera los bloqueos de turnos en estado PENDING con una ventana de vencimiento de 10 minutos. Reutiliza la pasarela transaccional de validación horaria e integridad de precios del sistema.',
  })
  @ApiResponse({ status: 201, description: 'Orden registrada y bloqueos temporales de turnos generados correctamente desde administración.',})
  @ApiResponse({ status: 400, description: 'Petición inválida: El cuerpo de la solicitud no cumple con las reglas del CreateAdminOrderDto (el userId o los IDs de turnos no son UUID válidos o el arreglo viene vacío).',}) 
  @ApiResponse({ status: 401, description: 'No autorizado: Token no enviado, inválido o expirado.', })
  @ApiResponse({ status: 403, description: 'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',})
  @ApiResponse({ status: 404, description: 'No encontrado: El userId provisto en el DTO no corresponde a ningún usuario registrado en el sistema, o alguno de los serviceId/professionalId no existen.',})
  @ApiResponse({ status: 409, description: 'Conflicto: El profesional o el cliente no se encuentran disponibles, se detectaron superposiciones horarias internas en la solicitud, o el precio final no pudo ser calculado.',})
  @ApiResponse({ status: 500, description: 'Error interno del servidor al procesar la transacción o persistir las entidades en lote de forma concurrente.',})
createAsAdmin(
  @Body() createAdminOrderDto:
    CreateAdminOrderDto,
) {
  const {
    userId,
    appointments,
  } = createAdminOrderDto;

  return this.ordersService.create(
    userId,
    { appointments },
  );
}
}
