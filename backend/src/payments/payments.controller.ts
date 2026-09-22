import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Procesar pago de una orden de forma atómica (solo administradores)',
    description:
      'Actualiza el estado del pago, marca la orden como abonada y confirma automáticamente los turnos asociados.',
  })
  @ApiResponse({
    status: 201,
    description: 'El pago ha sido procesado exitosamente',
    type: Payment,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos o falla en el procesamiento de la transacción',
  })
  @ApiResponse({
    status: 404,
    description: 'La orden especificada no fue encontrada',
  })
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.processPayment(processPaymentDto);
  }

  @Post('stripe/create-intent')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear el intento de pago de Stripe para una orden',
    description:
      'Calcula el monto en el backend y devuelve el clientSecret que usa el front para mostrar el formulario de pago.',
  })
  @ApiResponse({
    status: 201,
    description: 'Intento de pago creado, devuelve el clientSecret',
  })
  @ApiResponse({
    status: 404,
    description: 'La orden especificada no fue encontrada',
  })
  createStripeIntent(@Req() req: any,@Body() createPaymentDto: CreatePaymentDto,
) {
  return this.paymentsService.createStripeIntent(
    createPaymentDto.orderId, req.user.id, req.user.roles,
  );
}

  // Sin guards: Stripe no envía tu token, la seguridad es la firma del webhook
  @Post('stripe/webhook')
  @ApiExcludeEndpoint()
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody!, signature);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el listado de todos los pagos registrados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de transacciones de pago',
    type: [Payment],
  })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos de administrador para consultar la lista de pagos',
  })
  async findAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar el detalle de un pago por su ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del registro de pago',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del pago encontrado',
    type: Payment,
  })
  @ApiResponse({
    status: 404,
    description: 'Registro de pago no encontrado',
  })
  async getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }
}
