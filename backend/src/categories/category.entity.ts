import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Service } from '../services/entities/service.entity';

@Entity({ name: 'CATEGORIES' })
export class Category {
  @PrimaryGeneratedColumn('uuid', {
    name: 'category_id',
  })
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  icon!: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

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

  @OneToMany(
    () => Service,
    (service) => service.category,
  )
  services!: Service[];
}