import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderDetail } from './order-detail.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('ORDERS')
export class Order {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único de la orden',
  })
  @PrimaryGeneratedColumn('uuid')
  order_id!: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
    description: 'Estado actual de la orden',
  })
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @ApiProperty({
    description: 'Fecha de creación de la orden',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Usuario que generó la orden',
    type: () => User,
  })
  @ManyToOne(() => User, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @ApiProperty({
    description: 'Detalle asociado a la orden',
    type: () => OrderDetail,
  })
  @OneToOne(() => OrderDetail, (orderDetail) => orderDetail.order)
  orderDetails!: OrderDetail;

  @ApiProperty({
    description: 'Pago asociado a la orden',
    type: () => Payment,
    nullable: true,
  })
  @OneToOne(() => Payment, (payment) => payment.order)
  payment!: Payment | null;
}
