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
import { EmailVerificationToken } from '../../auth/email-verification/entities/email-verification-token.entity';
import { PasswordResetToken } from '../../auth/password-reset/entities/password-reset-token.entity';

@Entity({ name: 'USERS' })
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  name!: string;

  @Column({ unique: true, type: 'varchar', length: 50, nullable: false })
  email!: string;

  @Column({
    name: 'is_email_verified',
    type: 'boolean',
    default: false,
  })
  isEmailVerified!: boolean;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  password_hash!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
  })
  phone!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.CLIENT],
  })
  roles!: UserRole[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId!: string | null;

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

  @Column({ name: 'img_url', type: 'varchar', length: 500, nullable: true })
  imgUrl!: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.user)
  appointments!: Appointment[];

  @OneToOne(() => Professional, (professional) => professional.user)
  professionalProfile!: Professional | null;

  @OneToMany(
    () => EmailVerificationToken,
    (verificationToken) => verificationToken.user,
  )
  emailVerificationTokens!: EmailVerificationToken[];

  @OneToMany(() => PasswordResetToken, (resetToken) => resetToken.user)
  passwordResetTokens!: PasswordResetToken[];
}
