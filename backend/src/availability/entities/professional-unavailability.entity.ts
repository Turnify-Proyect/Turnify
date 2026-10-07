import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Professional } from '../../professionals/entities/professional.entity';

@Entity({ name: 'PROFESSIONAL_UNAVAILABILITIES' })
export class ProfessionalUnavailability {
  @PrimaryGeneratedColumn('uuid', {
    name: 'unavailability_id',
  })
  id!: string;

  @ManyToOne(() => Professional, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'professional_id' })
  professional!: Professional;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: false,
  })
  startDate!: string;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: false,
  })
  endDate!: string;

  @Column({
    name: 'reason',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  reason!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}