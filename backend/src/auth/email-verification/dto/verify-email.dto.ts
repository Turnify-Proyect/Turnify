import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  // El token generado por randomBytes(32).toString('hex')
  // contiene exactamente 64 caracteres hexadecimales.
  // comentado por: Lautaro-dev
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  @Matches(/^[a-f0-9]+$/i)
  token!: string;
}
