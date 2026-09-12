import * as dotenv from 'dotenv';
dotenv.config();

export const env = {
  // Aplication:
  //coemntado por:Lautaro-dev
  HOST: process.env.HOST || 'localhost',
  PORT: Number(process.env.PORT) || 3000,

  // Database:
  //coemntado por:Lautaro-dev
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,

  // JWT:
  //coemntado por:Lautaro-dev
  JWT_SECRET: process.env.JWT_SECRET,
};
