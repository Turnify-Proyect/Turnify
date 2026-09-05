import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
}

void bootstrap();
