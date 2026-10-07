import { Test, TestingModule } from '@nestjs/testing';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [OrdersController],
        providers: [
          {
            provide: OrdersService,
            useValue: mockOrdersService,
          },
        ],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: () => true,
        })
        .overrideGuard(RolesGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

    controller =
      module.get<OrdersController>(OrdersController);
  });



  describe('create', () => {
    it('should create an order for the authenticated user', async () => {
      const userId =
        '550e8400-e29b-41d4-a716-446655440000';

      const dto = {
        appointments: [
          {
            serviceId:
              '650e8400-e29b-41d4-a716-446655440000',
            professionalId:
              '750e8400-e29b-41d4-a716-446655440000',
            startAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      const request = {
        user: {
          id: userId,
        },
      };

      const expectedResult = {
        id: 'order-1',
      };

      mockOrdersService.create.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.create(
        request,
        dto,
      );

      expect(result).toEqual(expectedResult);

      expect(
        mockOrdersService.create,
      ).toHaveBeenCalledWith(userId, dto);

      expect(
        mockOrdersService.create,
      ).toHaveBeenCalledTimes(1);
    });

    it('should use the authenticated user id from req.user', async () => {
      const authenticatedUserId =
        '550e8400-e29b-41d4-a716-446655440000';

      const dto = {
        appointments: [],
      } as any;

      const request = {
        user: {
          id: authenticatedUserId,
        },
      };

      mockOrdersService.create.mockResolvedValue(
        {},
      );

      await controller.create(request, dto);

      expect(
        mockOrdersService.create,
      ).toHaveBeenCalledWith(
        authenticatedUserId,
        dto,
      );
    });

    it('should pass the exact DTO object to the service', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      const request = {
        user: {
          id: 'user-1',
        },
      };

      mockOrdersService.create.mockResolvedValue(
        {},
      );

      await controller.create(request, dto);

      const [userId, receivedDto] =
        mockOrdersService.create.mock.calls[0];

      expect(userId).toBe('user-1');
      expect(receivedDto).toBe(dto);
    });

    it('should propagate errors from OrdersService', async () => {
      const error = new Error('Create order error');

      const request = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        appointments: [],
      } as any;

      mockOrdersService.create.mockRejectedValue(
        error,
      );

      await expect(
        controller.create(request, dto),
      ).rejects.toThrow(error);
    });
  });

  describe('createAsAdmin', () => {
    it('should create an order for the specified client', async () => {
      const dto = {
        userId: 'client-1',
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      const expectedResult = {
        id: 'order-1',
      };

      mockOrdersService.create.mockResolvedValue(
        expectedResult,
      );

      const result =
        await controller.createAsAdmin(dto);

      expect(result).toEqual(expectedResult);

      expect(
        mockOrdersService.create,
      ).toHaveBeenCalledWith(
        dto.userId,
        {
          appointments: dto.appointments,
        },
      );
    });

    it('should use the userId from the admin DTO', async () => {
      const dto = {
        userId: 'client-123',
        appointments: [],
      } as any;

      mockOrdersService.create.mockResolvedValue(
        {},
      );

      await controller.createAsAdmin(dto);

      expect(
        mockOrdersService.create,
      ).toHaveBeenCalledWith(
        'client-123',
        {
          appointments: [],
        },
      );
    });

    it('should pass only appointments to OrdersService', async () => {
      const dto = {
        userId: 'client-1',
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
          },
        ],
        extraField: 'should-not-be-passed',
      } as any;

      mockOrdersService.create.mockResolvedValue(
        {},
      );

      await controller.createAsAdmin(dto);

      expect(
        mockOrdersService.create,
      ).toHaveBeenCalledWith(
        'client-1',
        {
          appointments: dto.appointments,
        },
      );
    });

    it('should create a new object containing the appointments', async () => {
      const appointments = [
        {
          serviceId: 'service-1',
          professionalId: 'professional-1',
        },
      ];

      const dto = {
        userId: 'client-1',
        appointments,
      } as any;

      mockOrdersService.create.mockResolvedValue(
        {},
      );

      await controller.createAsAdmin(dto);

      const [, createOrderDto] =
        mockOrdersService.create.mock.calls[0];

      expect(createOrderDto).toEqual({
        appointments,
      });

      expect(createOrderDto).not.toBe(dto);
    });

    it('should propagate errors from OrdersService', async () => {
      const error = new Error('Create order error');

      const dto = {
        userId: 'client-1',
        appointments: [],
      } as any;

      mockOrdersService.create.mockRejectedValue(
        error,
      );

      await expect(
        controller.createAsAdmin(dto),
      ).rejects.toThrow(error);
    });
  });
});
