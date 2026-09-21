import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesRepository } from './services.repository';
import { ProfessionalService } from 'src/professionals/entities/professional-service.entity';
import { CloudinaryConfig } from 'src/config/cloudinary';
import { CloudinaryService } from 'src/config/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service, ProfessionalService])],
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository, CloudinaryService, CloudinaryConfig],
  exports: [ServicesService],
})
export class ServicesModule {}
