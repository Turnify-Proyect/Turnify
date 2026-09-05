import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Professional } from './professional.entity';
import { Service } from '../../services/entities/service.entity';

@Entity({ name: 'PROFESSIONAL_SERVICES' })
export class ProfessionalService {
  @PrimaryColumn('uuid', { name: 'professional_id' })
  professionalId!: string;

  @PrimaryColumn('uuid', { name: 'service_id' })
  serviceId!: string;

  @ManyToOne(
    () => Professional,
    (professional) => professional.professionalServices,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'professional_id' })
  professional!: Professional;

  @ManyToOne(() => Service, (service) => service.professionalServices, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: Service;
}
