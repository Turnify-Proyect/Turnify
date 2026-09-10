import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  create(createPaymentDto: CreatePaymentDto) {
    return 'Pago creado exitosamente';
  }

  findAll() {
    return `Todos los pagos encontrados`;
  }

  findOne(id: number) {
    return `El pago #${id} ha sido encontrado`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `El pago #${id} ha sido actualizado`;
  }

  remove(id: number) {
    return `El pago #${id} ha sido eliminado`;
  }
}
