import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Pago creado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Error al realizar el pago',
  })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de pagos',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a la lista de pagos',
  })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Pago encontrado por su id',
  })
  @ApiResponse({
    status: 403,
    description: 'El pago no fue encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Pago actualizado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Error al actualizar el pago',
  })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Pago eliminado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Error al eliminar el pago',
  })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
