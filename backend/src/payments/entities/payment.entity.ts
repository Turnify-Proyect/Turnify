import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity({ name: 'PAYMENTS' })
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  id!: string;

  @OneToOne(() => Appointment, (appointment) => appointment.payment, {
    nullable: false,
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @Column({ type: 'varchar', length: 50, nullable: false })
  provider!: string;

  @Column({
    name: 'external_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
  })
  externalPaymentId!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;
}
