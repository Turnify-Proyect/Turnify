import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  create(
    @Req() req: any,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(
      req.user.id,
      createOrderDto,
    );
  }

  @Get(':id')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOne(id);
  }
}