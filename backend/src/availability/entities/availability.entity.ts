import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Professional } from '../../professionals/entities/professional.entity';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Entity({ name: 'AVAILABILITIES' })
export class Availability {
  @PrimaryGeneratedColumn('uuid', { name: 'availability_id' })
  id!: string;

  @ManyToOne(
    () => Professional,
    (professional) => professional.availabilities,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'professional_id' })
  professional!: Professional;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek!: DayOfWeek;

  @Column({ name: 'start_time', type: 'time', nullable: false })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time', nullable: false })
  endTime!: string;
}
