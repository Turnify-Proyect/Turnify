import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
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

  @OneToMany(
    () => Service,
    (service) => service.category,
  )
  services!: Service[];
}