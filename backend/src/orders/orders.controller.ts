import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorSwaggerResponse } from 'src/common/api/api-error-response.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';
import { ApiSuccessCreatedResponse } from 'src/common/api';
import { Order } from './entities/order.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessCreatedResponse(Order)
  @ApiOperation({
    summary: 'Crear una orden y reservar temporalmente un turno',
    description:
      'Crea la orden, su detalle y un turno pendiente asociado. El turno se confirma únicamente después del pago.',
  })
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para crear la orden')
  @ApiErrorSwaggerResponse(
    409,
    'El profesional o el usuario no se encuentran disponibles en el horario solicitado',
  )
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Post('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessCreatedResponse(Order)
  @ApiOperation({
    summary: 'Crear una orden para un cliente desde administración',
  })
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos de administrador para crear la orden',
  )
  @ApiErrorSwaggerResponse(
    409,
    'El profesional o el usuario no se encuentran disponibles en el horario solicitado',
  )
  createAsAdmin(@Body() createAdminOrderDto: CreateAdminOrderDto) {
    const { userId, appointments } = createAdminOrderDto;

    return this.ordersService.create(userId, { appointments });
  }
}
