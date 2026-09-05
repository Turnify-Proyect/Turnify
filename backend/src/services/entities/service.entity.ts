import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ProfessionalService } from '../../professionals/entities/professional-service.entity';

@Entity({ name: 'SERVICES' })
export class Service {
  @PrimaryGeneratedColumn('uuid', { name: 'service_id' })
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price!: string;

  @Column({ name: 'duration_minutes', type: 'int', nullable: false })
  durationMinutes!: number;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Appointment, (appointment) => appointment.service)
  appointments!: Appointment[];

  @OneToMany(
    () => ProfessionalService,
    (professionalService) => professionalService.service,
  )
  professionalServices!: ProfessionalService[];
}
