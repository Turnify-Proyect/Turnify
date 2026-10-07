import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../../users/entities/user.entity';

@Entity({ name: 'PASSWORD_RESET_TOKENS' })
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid', { name: 'password_reset_id' })
  id!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.passwordResetTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
