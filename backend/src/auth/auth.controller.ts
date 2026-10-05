import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiSuccessCreatedResponse } from 'src/common/api';
import { AuthService } from './auth.service';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/create-user.dto';
import { VerifyEmailDto } from './email-verification/dto/verify-email.dto';
import { ApiErrorSwaggerResponse } from '../common/api/api-error-response.decorator';
import { ApiSuccessResponse } from '../common/api/api-success-response.decorator';
import { AuthSignInResponseDto } from './dto/auth-signin-response.dto';
import { GoogleSignInResponseDto } from './dto/google-signin-response.dto';
import { AuthSignUpResponseDto } from './dto/auth-signup-response.dto';
import { VerifyEmailResponseDto } from './dto/verify-email-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiSuccessResponse(String)
  getAuth(): string {
    return this.authService.getAuth();
  }

  @Post('signin')
  // Signin no crea un recurso nuevo, por eso responde 200 OK
  // en lugar del 201 Created que Nest usa por defecto en los POST.
  //coemntado por:Lautaro-dev
  @ApiBody({ type: LoginUserDto })
  // Swagger documenta los códigos reales del endpoint:
  // 200 para login exitoso y 401 para credenciales inválidas.
  //coemntado por:Lautaro-dev
  @HttpCode(HttpStatus.OK)
  @ApiSuccessResponse(AuthSignInResponseDto)
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Credenciales inválidas')
  signIn(@Body() credential: LoginUserDto) {
    const { email, password } = credential;

    return this.authService.signIn(email, password);
  }

  // Quité authguard y apibeareruth porque Signup es una ruta pública. el usuario todavía no tiene un JWT, por eso no requiere ApiBearerAuth ni AuthGuard.
  //coemntado por:Lautaro-dev
  @Post('signup')
  // Swagger documenta los códigos reales del registro, 201 cuando se crea el usuario y 409 si el email ya existe.
  //coemntado por:Lautaro-dev
  @ApiSuccessCreatedResponse(AuthSignUpResponseDto)
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(409, 'El email ya está registrado')
  signUp(@Body() newUserData: CreateUserDto) {
    return this.authService.signUp(newUserData);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessResponse(GoogleSignInResponseDto)
  @ApiErrorSwaggerResponse(400, 'La credencial de Google no es válida')
  @ApiErrorSwaggerResponse(
    401,
    'No fue posible autenticar al usuario con Google',
  )
  googleSignIn(@Body('credential') credential: string) {
    return this.authService.googleSignIn(credential);
  }

  @Post('google/complete')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessResponse(AuthSignInResponseDto)
  @ApiErrorSwaggerResponse(400, 'Los datos de registro no son válidos')
  @ApiErrorSwaggerResponse(401, 'El token de registro no es válido o expiró')
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
  @ApiSuccessResponse(VerifyEmailResponseDto)
  @ApiErrorSwaggerResponse(401, 'Token inválido, expirado o ya utilizado')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(verifyEmailDto.token);

    return {
      message: 'Email verificado correctamente',
    };
  }
}
