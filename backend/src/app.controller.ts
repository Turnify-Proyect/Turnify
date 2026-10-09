import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Obtener saludo de bienvenida',
    description: 'Devuelve un mensaje estático de confirmación para verificar que la aplicación está levantada y respondiendo correctamente.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Respuesta exitosa del servidor.',
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error interno del servidor.' 
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
