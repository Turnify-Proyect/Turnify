import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Availability } from '../../availability/entities/availability.entity';
import { ProfessionalService } from '../../professionals/entities/professional-service.entity';
import { User } from '../../users/entities/user.entity';

export enum ProfessionalSpecialty {
  COSMETOLOGIA = 'cosmetología',
  MASAJES = 'masajes',
  MANICURIA = 'manicuría',
  PEDICURIA = 'pedicuría',
  DEPILACION = 'depilación',
}

@Entity({ name: 'PROFESSIONALS' })
export class Professional {
  @PrimaryGeneratedColumn('uuid', { name: 'professional_id' })
  id!: string;

  @OneToOne(() => User, (user) => user.professionalProfile, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ProfessionalSpecialty, nullable: false })
  specialty!: ProfessionalSpecialty;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Appointment, (appointment) => appointment.professional)
  appointments!: Appointment[];

  @OneToMany(
    () => ProfessionalService,
    (professionalService) => professionalService.professional,
  )
  professionalServices!: ProfessionalService[];

  @OneToMany(() => Availability, (availability) => availability.professional)
  availabilities!: Availability[];
}
