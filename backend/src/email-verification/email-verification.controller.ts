import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('email-verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Recibe el token original que el usuario obtuvo mediante el enlace
  // enviado a su correo y delega su validación al servicio.
  // comentado por: Lautaro-dev
  @Post('verify')
  @HttpCode(200)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.emailVerificationService.verifyEmail(verifyEmailDto.token);

    return {
      message: 'Email verificado correctamente',
    };
  }
}
