import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { StatisticsService } from './statistics.service';

import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';

@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
  ) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtener reportes y estadísticas del panel administrador',
    description:
      'Devuelve métricas de turnos, ingresos, servicios, profesionales y demanda dentro de un período determinado.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Estadísticas obtenidas correctamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Rango de fechas inválido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos para acceder',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '01/09/2026',
    description: 'Fecha inicial en formato DD/MM/AAAA',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '04/10/2026',
    description: 'Fecha final en formato DD/MM/AAAA',
  })
  getAdminStatistics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getAdminStatistics(
      from,
      to,
    );
  }
}