import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';
import { Appointment } from 'src/appointments/entities/appointment.entity';

@Entity('ORDER_DETAILS')
export class OrderDetail {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del detalle de la orden',
  })
  @PrimaryGeneratedColumn('uuid')
  order_detail_id!: string;

  @ApiProperty({
    example: 60000,
    description: 'Precio total de todos los servicios incluidos en la orden',
  })
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  total_price!: number;

  @ApiProperty({
    description: 'Orden a la que pertenece este detalle',
    type: () => Order,
  })
  @OneToOne(() => Order, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ApiProperty({
    description: 'Turnos asociados al detalle de la orden',
    type: () => [Appointment],
  })
  @OneToMany(() => Appointment, (appointment) => appointment.orderDetail)
  appointments!: Appointment[];
}
