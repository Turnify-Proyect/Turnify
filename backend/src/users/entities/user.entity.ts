import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Professional } from '../../professionals/entities/professional.entity';
import { UserRole } from '../../common/userRoles.enum';
import { AuthProvider } from '../../common/authProvider.enum';

@Entity({ name: 'USERS' })
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  name!: string;

  @Column({ unique: true, type: 'varchar', length: 50, nullable: false })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  password_hash!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: number | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role!: UserRole;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId!: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.user)
  appointments!: Appointment[];

  @OneToOne(() => Professional, (professional) => professional.user)
  professionalProfile!: Professional | null;
}
