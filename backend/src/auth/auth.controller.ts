import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/create-user.dto';
import { VerifyEmailDto } from './email-verification/dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar el estado del módulo de autenticación',
    description:
      'Devuelve un mensaje estático de confirmación para comprobar que el servicio y las estrategias de autenticación se encuentran levantadas y respondiendo correctamente. No requiere tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Módulo de autenticación en línea y respondiendo con éxito.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  getAuth(): string {
    return this.authService.getAuth();
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginUserDto })
  @ApiOperation({
    summary: 'Iniciar sesión de usuario (Autenticación Local)',
    description:
      'Valida las credenciales de acceso (email y contraseña), verifica el estado de activación por correo electrónico y retorna un token firmado digitalmente bajo el estándar JWT Bearer.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Inicio de sesión exitoso. Devuelve el token de acceso JWT firmado.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El formato del correo electrónico es incorrecto o la contraseña fue omitida.',
  })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado: Las credenciales provistas (correo o contraseña) son incorrectas.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: Las credenciales son válidas, pero se requiere verificar la casilla de correo electrónico antes de ingresar.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la encriptación de datos o la firma del token.',
  })
  signIn(@Body() credential: LoginUserDto) {
    const { email, password } = credential;

    return this.authService.signIn(email, password);
  }

  @Post('signup')
  @ApiOperation({
    summary: 'Registrar un nuevo usuario en el sistema',
    description:
      'Crea una nueva cuenta de usuario con proveedor de autenticación LOCAL. Valida la unicidad del email y teléfono, encripta la contraseña de forma segura y procesa de forma asíncrona el token de activación por correo electrónico.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Usuario registrado exitosamente y correo de verificación procesado.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Los datos enviados no cumplen con las reglas del DTO (formatos de correo, teléfono largo, contraseñas débiles o confirmación de contraseña despareja).',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El correo electrónico o el número de teléfono ya se encuentran registrados por otro usuario en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la persistencia de datos en el repositorio.',
  })
  signUp(@Body() newUserData: CreateUserDto) {
    return this.authService.signUp(newUserData);
  }

  @Post('google')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        credential: {
          type: 'string',
          description:
            'El ID Token en formato JWT provisto por el SDK de Google tras la autenticación del cliente',
          example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3Z...',
        },
      },
      required: ['credential'],
    },
  })
  @ApiOperation({
    summary: 'Autenticación o pre-registro mediante Google OAuth',
    description:
      'Verifica la validez del token de Google contra su API oficial. Si el usuario ya existe con proveedor GOOGLE, inicia sesión directo. Si es un usuario nuevo, congela sus datos en un token temporal de 15 minutos y solicita registrar el teléfono de forma obligatoria.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Operación procesada con éxito. Puede retornar el token definitivo de sesión o un token temporal si se requiere registrar el teléfono.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Se omitió el campo credential en el cuerpo de la solicitud.',
  })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado: El token de Google es inválido, el correo de Google no está verificado, o el identificador sub no coincide con el registro original.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El email provisto por Google ya se encuentra registrado bajo el método de autenticación tradicional (LOCAL).',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la firma del token JWT o al conectar con las APIs de Google.',
  })
  @HttpCode(HttpStatus.OK)
  googleSignIn(@Body('credential') credential: string) {
    return this.authService.googleSignIn(credential);
  }

  @Post('google/complete')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        registrationToken: {
          type: 'string',
          description:
            'Token JWT temporal provisto por el endpoint /google que expira en 15 minutos',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        phone: {
          type: 'string',
          description:
            'Número de teléfono obligatorio para completar el perfil del usuario',
          example: '+54 343 1234567',
        },
        country: {
          type: 'string',
          description: 'País del usuario (Opcional)',
          example: 'Argentina',
        },
        address: {
          type: 'string',
          description: 'Dirección física del usuario (Opcional)',
          example: 'Calle Falsa 123',
        },
        city: {
          type: 'string',
          description: 'Ciudad de residencia (Opcional)',
          example: 'Rosario',
        },
      },
      required: ['registrationToken', 'phone'],
    },
  })
  @ApiOperation({
    summary: 'Completar el registro federado de Google',
    description:
      'Consume el token temporal de registro, valida la unicidad del teléfono provisto y crea físicamente la cuenta con proveedor GOOGLE. Omite el hasheo de contraseñas locales y marca de forma automática el correo como verificado.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Registro consolidado exitosamente. Retorna el token definitivo Bearer de sesión activa.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Se omitieron parámetros requeridos como registrationToken o el número de teléfono.',
  })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado: El token de registro expiró, es inválido o hubo un problema al asentar la cuenta en el sistema.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El correo electrónico o el número de teléfono provistos ya se encuentran en uso en la base de datos.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la persistencia o la firma definitiva del token de sesión.',
  })
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
  @ApiOperation({
    summary: 'Verificar el correo electrónico de un usuario registrado',
    description:
      'Recibe el token hash enviado por correo electrónico, valida su vigencia y activa la cuenta del usuario cambiando el estado isEmailVerified a true para permitirle iniciar sesión.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Email verificado correctamente. El usuario ya puede iniciar sesión.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El campo token es requerido, o no cumple con el formato exacto de 64 caracteres hexadecimales.',
  })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado: El token de verificación provisto es inválido, ya fue utilizado o ha expirado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización del estado en la base de datos.',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(verifyEmailDto.token);

    return {
      message: 'Email verificado correctamente',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar la recuperación de contraseña',
    description:
      'Recibe un correo electrónico y, si el usuario existe y está registrado de forma local, genera un token temporal y envía un enlace de restablecimiento por e-mail. Por motivos de seguridad, la respuesta es idéntica si el correo existe o no.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud procesada con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El campo email es requerido o el formato de correo electrónico provisto no es válido.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar generar el token o procesar el flujo.',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer la contraseña utilizando un token válido',
    description:
      'Valida la vigencia del token de recuperación provisto y, de ser correcto, actualiza la contraseña de la cuenta del usuario en la base de datos de forma segura.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Contraseña restablecida exitosamente. El usuario ya puede iniciar sesión con sus nuevas credenciales.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Se omitieron parámetros requeridos o la nueva contraseña no cumple con el mínimo de 8 caracteres.',
  })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado: El token de recuperación proporcionado es inválido, ya fue utilizado o ha expirado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar el hasheo de la contraseña o la persistencia de datos.',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
