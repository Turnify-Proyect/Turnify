import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let statisticsService: { getAdminStatistics: jest.Mock };

  const statisticsResponse = {
    period: { from: '01/10/2026', to: '31/10/2026' },
    summary: { totalAppointments: 10 },
  };

  beforeEach(async () => {
    statisticsService = {
      getAdminStatistics: jest.fn().mockResolvedValue(statisticsResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: statisticsService }],
    })
      // Los guards se prueban por separado; acá los dejamos pasar.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(StatisticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getAdminStatistics', () => {
    it('delega en el servicio con from y to', async () => {
      const result = await controller.getAdminStatistics(
        '01/10/2026',
        '31/10/2026',
      );

      expect(statisticsService.getAdminStatistics).toHaveBeenCalledTimes(1);
      expect(statisticsService.getAdminStatistics).toHaveBeenCalledWith(
        '01/10/2026',
        '31/10/2026',
      );
      expect(result).toEqual(statisticsResponse);
    });

    it('delega en el servicio sin parámetros (usa el período por defecto)', async () => {
      await controller.getAdminStatistics();

      expect(statisticsService.getAdminStatistics).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('permite enviar solo "from"', async () => {
      await controller.getAdminStatistics('01/10/2026');

      expect(statisticsService.getAdminStatistics).toHaveBeenCalledWith(
        '01/10/2026',
        undefined,
      );
    });

    it('permite enviar solo "to"', async () => {
      await controller.getAdminStatistics(undefined, '31/10/2026');

      expect(statisticsService.getAdminStatistics).toHaveBeenCalledWith(
        undefined,
        '31/10/2026',
      );
    });

    it('propaga los errores del servicio (rango inválido)', async () => {
      const error = new BadRequestException(
        'La fecha desde no puede ser posterior a la fecha hasta',
      );
      statisticsService.getAdminStatistics.mockRejectedValue(error);

      await expect(
        controller.getAdminStatistics('31/10/2026', '01/10/2026'),
      ).rejects.toBe(error);
    });
  });

  describe('metadata de la ruta', () => {
    const handler = StatisticsController.prototype.getAdminStatistics;

    it('el controlador está montado en /statistics', () => {
      expect(Reflect.getMetadata(PATH_METADATA, StatisticsController)).toBe(
        'statistics',
      );
    });

    it('el endpoint responde a GET /statistics/admin', () => {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('admin');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
        RequestMethod.GET,
      );
    });

    it('está protegido con AuthGuard y RolesGuard (en ese orden)', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        AuthGuard,
        RolesGuard,
      ]);
    });
  });
});
