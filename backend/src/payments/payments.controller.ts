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
import { ApiErrorSwaggerResponse, ApiSuccessArrayResponse, ApiSuccessCreatedResponse, ApiSuccessResponse } from 'src/common/api';
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
import { ProcessCashPaymentDto } from './dto/process-cash-payment.dto';

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
  @ApiSuccessCreatedResponse(Payment)
  @ApiErrorSwaggerResponse(
    400,
    'Datos inválidos o falla en el procesamiento de la transacción',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos de administrador')
  @ApiErrorSwaggerResponse(404, 'La orden especificada no fue encontrada')
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.processPayment(processPaymentDto);
  }

 @Post('cash')
 @Roles(UserRole.ADMIN)
 @UseGuards(AuthGuard, RolesGuard)
 @ApiBearerAuth()
 @ApiOperation({
   summary: 'Registrar un pago en efectivo',
   description:
     'Registra el cobro en efectivo de la seña o del valor total de una orden y confirma los turnos asociados.',
 })
 @ApiSuccessCreatedResponse(Payment)
 @ApiErrorSwaggerResponse(400, 'Datos inválidos o falla en el procesamiento')
 @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
 @ApiErrorSwaggerResponse(403, 'Sin permisos de administrador')
  async processCashPayment(@Body() processCashPaymentDto: ProcessCashPaymentDto,): Promise<Payment> {
    return this.paymentsService.processCashPayment(processCashPaymentDto);
  }

  @Post('stripe/create-intent')
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear el intento de pago de Stripe para una orden',
    description:
      'Crea el PaymentIntent únicamente para una orden pendiente perteneciente al usuario autenticado.',
  })
  @ApiSuccessCreatedResponse(Object)
  @ApiErrorSwaggerResponse(
    400,
    'La orden o la reserva ya no se encuentran disponibles para pagar',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'El usuario no tiene permisos para generar este pago',
  )
  @ApiErrorSwaggerResponse(
    404,
    'La orden no existe o no pertenece al usuario autenticado',
  )
  createStripeIntent(
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    // El usuario se obtiene del JWT para evitar que un cliente
    // pueda generar un PaymentIntent para la orden de otro usuario.
    // comentado por: Lautaro-dev
    return this.paymentsService.createStripeIntent(
      createPaymentDto.orderId,
      req.user.id,
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
  @ApiSuccessArrayResponse(Payment)
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos de administrador para consultar la lista de pagos',
  )
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
  @ApiSuccessResponse(Payment)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para consultar este pago')
  @ApiErrorSwaggerResponse(404, 'Registro de pago no encontrado')
  async getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }

  @Post('stripe/admin/checkout-session')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Generar enlace de pago para una reserva creada por administración',
  })
  @ApiSuccessCreatedResponse(Object)
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos de administrador')
  @ApiErrorSwaggerResponse(404, 'La orden no fue encontrada')
  createAdminCheckoutSession(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createAdminCheckoutSession(
      createPaymentDto.orderId,
    );
  }
}
