import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/create-user.dto';

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
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 201,
    description: 'Inicio de sesion exitoso',
  })
  @ApiResponse({
    status: 400,
    description: 'Credenciales invalidas',
  })
  signIn(@Body() Credential: LoginUserDto) {
    const { email, password_hash } = Credential;
    return this.authService.signIn(email, password_hash);
  }

  @Post('signup')
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Usuario deslogeado exitosamente',
  })
  signUp(@Body() newUserData: CreateUserDto) {
    return this.authService.signUp(newUserData);
  }
}
