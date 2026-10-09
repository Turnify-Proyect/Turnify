import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { StatisticsService } from './statistics.service';

import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener reportes y estadísticas del panel administrador',
    description:
      'Calcula y consolida de forma dinámica métricas clave de negocio (ingresos por señas, ingresos totales, tasas de cancelación, evolución cronológica, top de servicios y profesionales con mayor demanda) dentro de un período determinado.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-09-01',
    description:
      'Fecha inicial para el filtrado del reporte. Si se omite, el sistema resuelve un rango por defecto.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-10-04',
    description:
      'Fecha final para el filtrado del reporte. Si se omite, el sistema resuelve un rango por defecto.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Estadísticas analizadas y consolidadas correctamente de forma estructurada.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El formato de los parámetros de fecha provistos es incorrecto o inválido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno: Falla en la consulta con el operador Between o desbordamiento matemático en el procesamiento del mapa de relaciones.',
  })
  getAdminStatistics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.statisticsService.getAdminStatistics(from, to);
  }
}
