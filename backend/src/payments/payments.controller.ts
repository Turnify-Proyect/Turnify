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
  ApiTags,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { ProcessCashPaymentDto } from './dto/process-cash-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';
import { ApiResponse } from '@nestjs/swagger';

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
      'Procesar pago de una orden de forma atómica (Solo Administradores)',
    description:
      'Actualiza el estado del pago mediante una transacción segura. Si el estado es PAID, confirma los turnos asociados, anula sus marcas de expiración temporal, asienta las fechas y dispara de forma asíncrona la notificación por correo electrónico.',
  })
  @ApiResponse({
    status: 201,
    description:
      'El pago ha sido procesado exitosamente y los estados relacionales fueron actualizados.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: La orden ya está paga, no tiene turnos asociados, los turnos ya expiraron/cancelaron, o hubo un fallo crítico en la transacción.',
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
      'No encontrado: No existe ninguna orden registrada con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor en la base de datos o fallo crítico en el motor transaccional.',
  })
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
      'Registra el cobro presencial en efectivo de la seña o del valor total de una orden. Calcula el monto correspondiente y reutiliza la pasarela transaccional interna para confirmar los turnos asociados de forma segura.',
  })
  @ApiResponse({
    status: 201,
    description:
      'El pago en efectivo ha sido registrado y procesado de forma exitosa.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Los datos del ProcessCashPaymentDto son incorrectos, la orden ya está paga, o los turnos asociados han expirado o fueron cancelados.',
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
      'No encontrado: No existe ninguna orden registrada con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la transacción o guardar en la base de datos.',
  })
  async processCashPayment(
    @Body() processCashPaymentDto: ProcessCashPaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.processCashPayment(processCashPaymentDto);
  }

  @Post('stripe/create-intent')
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear el intento de pago de Stripe para una orden',
    description:
      'Genera un PaymentIntent en Stripe únicamente para una orden pendiente que pertenezca al usuario autenticado. Implementa claves de idempotencia seguras para evitar cargos duplicados por reintentos de red.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Intento de pago creado exitosamente en Stripe, devuelve el clientSecret para inicializar el SDK del frontend.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: La orden no está pendiente, no contiene citas o la reserva temporal de los turnos asociados ya caducó.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: El usuario autenticado no posee el rol de CLIENT.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: La orden especificada no existe o no corresponde al cliente que inició sesión.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno: Falla crítica de comunicación con las APIs externas de Stripe o error en la consulta transaccional.',
  })
  createStripeIntent(
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createStripeIntent(
      createPaymentDto.orderId,
      req.user.id,
    );
  }

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
    summary:
      'Obtener el listado de todos los pagos registrados (Solo Administradores)',
    description:
      'Devuelve un listado completo con el historial de todas las transacciones de pago procesadas en el sistema, incluyendo los datos básicos de su orden asociada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de transacciones de pago devuelta con éxito.',
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
    status: 500,
    description:
      'Error interno del servidor al consultar el historial de pagos en la base de datos.',
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
    description:
      'Devuelve la información detallada de una transacción de pago específica junto con su orden, detalles de facturación y turnos vinculados. Accesible para Administradores y Clientes.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'ID del registro de pago en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalle del pago encontrado y devuelto con éxito junto con sus relaciones.',
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
      'Prohibido: El usuario autenticado no posee un rol válido para consultar esta transacción (ej. un PROFESSIONAL).',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No se encontró un registro de pago con el ID proporcionado en la base de datos.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar el registro o mapear sus relaciones anidadas.',
  })
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
      'Generar enlace de pago para una reserva creada por administración (Solo Administradores)',
    description:
      'Crea una sesión de Stripe Checkout de 30 minutos para una orden pendiente. Sincroniza la expiración de los turnos asociados, genera una clave de idempotencia única y dispara de forma asíncrona la notificación por correo electrónico con el link de pago.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Enlace de pago generado correctamente en Stripe y metadatos temporales actualizados.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: La orden no está pendiente, no contiene citas, los turnos ya expiraron, falta configurar FRONTEND_URL en el .env, o Stripe no generó el enlace.',
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
      'No encontrado: No existe ninguna orden registrada con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la transacción o fallo crítico con el SDK de Stripe.',
  })
  createAdminCheckoutSession(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createAdminCheckoutSession(
      createPaymentDto.orderId,
    );
  }
}
