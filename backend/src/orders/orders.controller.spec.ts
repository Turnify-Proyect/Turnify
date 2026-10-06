import { Test, TestingModule } from '@nestjs/testing';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('OrdersController', () => {
  let controller: OrdersController;

  const ordersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('create', () => {
    it('should create an order using the authenticated user id', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const createOrderDto = {
        appointmentId: 'appointment-1',
      } as any;

      const order = {
        id: 'order-1',
        userId: 'user-1',
        appointmentId: 'appointment-1',
        status: 'pending',
      };

      ordersService.create.mockResolvedValue(order);

      const result = await controller.create(req, createOrderDto);

      expect(result).toEqual(order);

      expect(ordersService.create).toHaveBeenCalledWith(
        'user-1',
        createOrderDto,
      );
    });

    it('should use the user id from the JWT instead of the DTO', async () => {
      const req = {
        user: {
          id: 'authenticated-user',
        },
      };

      const createOrderDto = {
        appointmentId: 'appointment-1',
        userId: 'another-user',
      } as any;

      const order = {
        id: 'order-1',
        userId: 'authenticated-user',
      };

      ordersService.create.mockResolvedValue(order);

      const result = await controller.create(req, createOrderDto);

      expect(result).toEqual(order);

      expect(ordersService.create).toHaveBeenCalledWith(
        'authenticated-user',
        createOrderDto,
      );

      expect(ordersService.create).not.toHaveBeenCalledWith(
        'another-user',
        createOrderDto,
      );
    });

    it('should propagate the service error', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const createOrderDto = {
        appointmentId: 'appointment-1',
      } as any;

      const error = new Error('Order creation failed');

      ordersService.create.mockRejectedValue(error);

      await expect(controller.create(req, createOrderDto)).rejects.toThrow(
        'Order creation failed',
      );

      expect(ordersService.create).toHaveBeenCalledWith(
        'user-1',
        createOrderDto,
      );
    });
  });
});
