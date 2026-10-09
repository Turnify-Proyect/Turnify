import { Reflector } from '@nestjs/core';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { UserRole } from '../common/userRoles.enum';

describe('StatisticsController', () => {
  let controller: StatisticsController;

  let statisticsServiceMock: {
    getAdminStatistics: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    statisticsServiceMock = {
      getAdminStatistics: jest.fn(),
    };

    controller = new StatisticsController(
      statisticsServiceMock as unknown as StatisticsService,
    );
  });

  describe('getAdminStatistics', () => {
    it('should call the service without date filters', async () => {
      const response = {
        period: {
          from: '01/10/2026',
          to: '07/10/2026',
        },
        summary: {
          totalAppointments: 10,
          completedAppointments: 7,
          cancelledAppointments: 1,
          cancellationRate: 10,
          depositRevenue: 1000,
          completedServicesRevenue: 5000,
          totalRevenue: 6000,
        },
        appointmentsByStatus: {
          pending: 1,
          confirmed: 1,
          completed: 7,
          cancelled: 1,
          expired: 0,
        },
        appointmentsEvolution: [],
        topServices: [],
        topProfessionals: [],
        demandByWeekday: [],
      };

      statisticsServiceMock.getAdminStatistics.mockResolvedValue(response);

      const result = await controller.getAdminStatistics();

      expect(result).toBe(response);

      expect(statisticsServiceMock.getAdminStatistics).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('should pass from and to dates to the service', async () => {
      const response = {
        period: {
          from: '01/09/2026',
          to: '04/10/2026',
        },
      };

      statisticsServiceMock.getAdminStatistics.mockResolvedValue(response);

      const result = await controller.getAdminStatistics(
        '01/09/2026',
        '04/10/2026',
      );

      expect(result).toBe(response);

      expect(statisticsServiceMock.getAdminStatistics).toHaveBeenCalledWith(
        '01/09/2026',
        '04/10/2026',
      );
    });

    it('should pass only the from date when to is not provided', async () => {
      const response = {
        period: {
          from: '01/09/2026',
          to: '04/10/2026',
        },
      };

      statisticsServiceMock.getAdminStatistics.mockResolvedValue(response);

      const result = await controller.getAdminStatistics(
        '01/09/2026',
        undefined,
      );

      expect(result).toBe(response);

      expect(statisticsServiceMock.getAdminStatistics).toHaveBeenCalledWith(
        '01/09/2026',
        undefined,
      );
    });
  });

  describe('authorization metadata', () => {
    const reflector = new Reflector();

    it('should require ADMIN role for getAdminStatistics', () => {
      const roles = reflector.get(
        'roles',
        StatisticsController.prototype.getAdminStatistics,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
