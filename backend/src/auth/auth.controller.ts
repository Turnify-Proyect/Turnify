import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/create-user.dto';
import { VerifyEmailDto } from './email-verification/dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Informacion de autenticacion',
  })
  @ApiResponse({
    status: 403,
    description: 'Error en la solicitud de autenticacion',
  })
  getAuth(): string {
    return this.authService.getAuth();
  }

  @Post('signin')
  // Signin no crea un recurso nuevo, por eso responde 200 OK
  // en lugar del 201 Created que Nest usa por defecto en los POST.
  //coemntado por:Lautaro-dev
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginUserDto })
  // Swagger documenta los códigos reales del endpoint:
  // 200 para login exitoso y 401 para credenciales inválidas.
  //coemntado por:Lautaro-dev
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesion exitoso',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales invalidas',
  })
  signIn(@Body() credential: LoginUserDto) {
    const { email, password } = credential;

    return this.authService.signIn(email, password);
  }

  // Quité authguard y apibeareruth porque Signup es una ruta pública. el usuario todavía no tiene un JWT, por eso no requiere ApiBearerAuth ni AuthGuard.
  //coemntado por:Lautaro-dev
  @Post('signup')
  // Swagger documenta los códigos reales del registro, 201 cuando se crea el usuario y 409 si el email ya existe.
  //coemntado por:Lautaro-dev
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
  })
  signUp(@Body() newUserData: CreateUserDto) {
    return this.authService.signUp(newUserData);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleSignIn(@Body('credential') credential: string) {
    return this.authService.googleSignIn(credential);
  }

  @Post('google/complete')
  @HttpCode(HttpStatus.OK)
  googleCompleteSignUp(
    @Body('registrationToken') registrationToken: string,
    @Body('phone') phone: string,
    @Body('country') country?: string,
    @Body('address') address?: string,
    @Body('city') city?: string,
  ) {
    return this.authService.googleCompleteSignUp(
      registrationToken,
      phone,
      country,
      address,
      city,
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Email verificado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado o ya utilizado',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(verifyEmailDto.token);

    return {
      message: 'Email verificado correctamente',
    };
  }
}
