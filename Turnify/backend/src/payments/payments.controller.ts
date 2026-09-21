import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Headers,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Payment } from './entities/payment.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({
    summary: 'Webhook de escucha para eventos de Stripe',
    description: 'Recibe notificaciones asíncronas de Stripe de forma segura y automática.',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!signature) {
      return res.status(400).send('Falta la firma de Stripe');
    }

    try {
      // Enviamos el rawBody que configuramos en el main.ts y la firma digital
      await this.paymentsService.handleWebhook(req.rawBody, signature);
      
      // Es vital responderle un 200 OK rápido a Stripe para que no reintente el envío
      return res.status(200).json({ received: true });
    } catch (error: any) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  @Post('process')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Procesar pago de una orden de forma atómica',
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
