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

  // Cambié nullable: true porque los usuarios autenticados mediante un proveedor externo (por ejemplo Google) pueden no tener una contraseña local almacenada en Turnify.
  //coemntado por:Lautaro-dev
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  password_hash!: string | null;

  // El teléfono se almacena como string porque puede contener código de país, prefijos, espacios o ceros iniciales. Es obligatorio para todo usuario.
  //coemntado por:Lautaro-dev
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
  })
  phone!: string;

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

  //Agregué las propiedades country, city y address que se contemplan en el create-user.DTO como opcionales
  //coemntado por:Lautaro-dev
  @Column({
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  country!: string | null;

  @Column({
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  address!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  city!: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.user)
  appointments!: Appointment[];

  @OneToOne(() => Professional, (professional) => professional.user)
  professionalProfile!: Professional | null;
}
