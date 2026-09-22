import { registerAs } from '@nestjs/config';
import { env } from './env';

const config = {
  type: 'postgres',
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT) || 5432,
  database: env.DB_NAME,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  autoLoadEntities: true,
  logging: true,
  synchronize: true,
  dropSchema: false,
  ssl:
    process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

export const typeOrmConfig = registerAs('typeorm', () => config);
