import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const dataSource = app.get(DataSource);

  if (dataSource.isInitialized) {
    console.log('Database connected successfully');
  }

  const config = new DocumentBuilder()
    .setTitle('Proyecto Final Turnify')
    .setDescription('Proyecto desarrollado con NestJS y TypeORM')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
}

void bootstrap();
