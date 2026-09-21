import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from '../../orders/entities/order.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity({ name: 'PAYMENTS' })
export class Payment {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del pago',
  })
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  id!: string;

  @ApiProperty({
    description: 'Orden asociada al pago',
    type: () => Order,
  })
  @OneToOne(() => Order, (order) => order.payment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ApiProperty({ example: 'mercadopago', description: 'Pasarela de pago' })
  @Column({ type: 'varchar', length: 50, nullable: false, default: 'mercadopago' })
  provider!: string;

  @ApiProperty({
    example: 'mp_pay_123456789',
    description: 'ID del pago en la pasarela externa',
    nullable: true,
  })
  @Column({
    name: 'external_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalPaymentId!: string | null;

  @ApiProperty({ example: '4500.00', description: 'Monto procesado' })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Fecha en la que fue abonado el pago', nullable: true })
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ description: 'Fecha de creación del registro de pago' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
