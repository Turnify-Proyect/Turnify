import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.enableCors({
    // El origen permitido se obtiene desde las variables de entorno.
    // En desarrollo será localhost y en producción será la URL
    // del frontend desplegado.
    // comentado por: Lautaro-dev
    origin: frontendUrl,
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

  // Render necesita que el servidor pueda escuchar conexiones externas.
  // El puerto es proporcionado automáticamente por Render.
  // comentado por: Lautaro-dev
  await app.listen(port, host);

  console.log(`Server is running on ${host}:${port}`);
}

void bootstrap();
