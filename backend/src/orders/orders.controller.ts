import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

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
  @ApiOperation({
    summary: 'Crear una orden y reservar temporalmente un turno',
    description:
      'Crea la orden, su detalle y un turno pendiente asociado. El turno se confirma únicamente después del pago.',
  })
  @ApiResponse({
    status: 201,
    description: 'Orden y turno pendiente creados correctamente',
  })
  @ApiResponse({
    status: 409,
    description:
      'El profesional o el usuario no se encuentran disponibles en el horario solicitado',
  })
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    // El userId se obtiene del JWT y no del body para impedir
    // que un cliente genere una orden a nombre de otro usuario.
    // comentado por: Lautaro-dev
    return this.ordersService.create(req.user.id, createOrderDto);
  }
}
