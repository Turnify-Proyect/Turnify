import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Professional } from '../../professionals/entities/professional.entity';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';
import { OrderDetail } from '../../orders/entities/order-detail.entity';

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity({ name: 'APPOINTMENTS' })
export class Appointment {
  @PrimaryGeneratedColumn('uuid', { name: 'appointment_id' })
  id!: string;

  @ManyToOne(() => User, (user) => user.appointments, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Professional, (professional) => professional.appointments, {
    nullable: false,
  })
  @JoinColumn({ name: 'professional_id' })
  professional!: Professional;

  @ManyToOne(() => Service, (service) => service.appointments, {
    nullable: false,
  })
  @JoinColumn({ name: 'service_id' })
  service!: Service;

  @ManyToOne(() => OrderDetail, (orderDetail) => orderDetail.appointments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_detail_id' })
  orderDetail!: OrderDetail;

  @Column({ name: 'start_at', type: 'timestamptz', nullable: false })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: false })
  endAt!: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status!: AppointmentStatus;

  @Column({ name: 'reschedule_count', type: 'int', default: 0 })
  rescheduleCount!: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
