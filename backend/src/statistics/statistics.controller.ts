import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { StatisticsService } from './statistics.service';
import { ApiErrorSwaggerResponse } from 'src/common/api/api-error-response.decorator';
import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { ApiSuccessResponse } from 'src/common/api';
import { AdminStatisticsResponseDto } from './dto/admin-statistics-response.dto';

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
      'Devuelve métricas de turnos, ingresos, servicios, profesionales y demanda dentro de un período determinado.',
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
  @ApiSuccessResponse(AdminStatisticsResponseDto)
  @ApiErrorSwaggerResponse(400, 'Rango de fechas inválido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para acceder')
  getAdminStatistics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.statisticsService.getAdminStatistics(from, to);
  }
}
