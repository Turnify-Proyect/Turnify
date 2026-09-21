import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // 💡 MODIFICADO: Agregamos el objeto de configuración con 'rawBody: true'
  // Esto le permite a NestJS guardar una copia exacta y sin procesar del body para Stripe.
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // 💡 AJUSTADO: Agregamos el puerto de Next.js (3000) manteniendo el de Vite (5173) para evitar errores de CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
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

  // Guardamos el puerto en una constante para que el console.log no rompa si process.env.PORT no está definido
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}

void bootstrap();
