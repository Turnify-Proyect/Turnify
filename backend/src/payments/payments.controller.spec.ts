import { Test, TestingModule } from '@nestjs/testing';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const paymentsServiceMock = {
    processPayment: jest.fn(),
    processCashPayment: jest.fn(),
    createStripeIntent: jest.fn(),
    handleStripeWebhook: jest.fn(),
    findAll: jest.fn(),
    getPaymentById: jest.fn(),
    createAdminCheckoutSession: jest.fn(),
  };

  const mockPaymentsService = {
    processPayment: jest.fn(),
    processCashPayment: jest.fn(),
    createStripeIntent: jest.fn(),
    handleStripeWebhook: jest.fn(),
    findAll: jest.fn(),
    getPaymentById: jest.fn(),
    createAdminCheckoutSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
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

    controller = module.get<PaymentsController>(PaymentsController);
  });

  describe('processPayment', () => {
    it('should process a payment using the provided DTO', async () => {
      const dto = {
        orderId: 'order-1',
        paymentMethod: 'stripe',
      } as any;

      const expectedResult = {
        id: 'payment-1',
        status: 'paid',
      } as any;

      mockPaymentsService.processPayment.mockResolvedValue(expectedResult);

      const result = await controller.processPayment(dto);

      expect(result).toEqual(expectedResult);

      expect(mockPaymentsService.processPayment).toHaveBeenCalledWith(dto);

      expect(mockPaymentsService.processPayment).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Payment processing error');

      const dto = {
        orderId: 'order-1',
      } as any;

      mockPaymentsService.processPayment.mockRejectedValue(error);

      await expect(controller.processPayment(dto)).rejects.toThrow(error);
    });
  });

  describe('processCashPayment', () => {
    it('should process a cash payment using the provided DTO', async () => {
      const dto = {
        orderId: 'order-1',
        amount: 100,
      } as any;

      const expectedResult = {
        id: 'payment-1',
        status: 'paid',
      } as any;

      mockPaymentsService.processCashPayment.mockResolvedValue(expectedResult);

      const result = await controller.processCashPayment(dto);

      expect(result).toEqual(expectedResult);

      expect(mockPaymentsService.processCashPayment).toHaveBeenCalledWith(dto);

      expect(mockPaymentsService.processCashPayment).toHaveBeenCalledTimes(1);
    });

    it('should pass the exact DTO object to the service', async () => {
      const dto = {
        orderId: 'order-1',
        amount: 150,
        extraField: 'test',
      } as any;

      mockPaymentsService.processCashPayment.mockResolvedValue({});

      await controller.processCashPayment(dto);

      const receivedDto =
        mockPaymentsService.processCashPayment.mock.calls[0][0];

      expect(receivedDto).toBe(dto);
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Cash payment error');

      const dto = {
        orderId: 'order-1',
        amount: 100,
      } as any;

      mockPaymentsService.processCashPayment.mockRejectedValue(error);

      await expect(controller.processCashPayment(dto)).rejects.toThrow(error);
    });
  });

  describe('createStripeIntent', () => {
    it('should create a Stripe intent using the order id and authenticated user id', async () => {
      const orderId = 'order-1';
      const userId = 'user-1';

      const dto = {
        orderId,
      } as any;

      const request = {
        user: {
          id: userId,
        },
      };

      const expectedResult = {
        clientSecret: 'pi_secret_123',
      };

      mockPaymentsService.createStripeIntent.mockResolvedValue(expectedResult);

      const result = await controller.createStripeIntent(request, dto);

      expect(result).toEqual(expectedResult);

      expect(mockPaymentsService.createStripeIntent).toHaveBeenCalledWith(
        orderId,
        userId,
      );

      expect(mockPaymentsService.createStripeIntent).toHaveBeenCalledTimes(1);
    });

    it('should use the authenticated user id from req.user', async () => {
      const authenticatedUserId = 'authenticated-user-1';

      const dto = {
        orderId: 'order-123',
      } as any;

      const request = {
        user: {
          id: authenticatedUserId,
        },
      };

      mockPaymentsService.createStripeIntent.mockResolvedValue({});

      await controller.createStripeIntent(request, dto);

      expect(mockPaymentsService.createStripeIntent).toHaveBeenCalledWith(
        'order-123',
        authenticatedUserId,
      );
    });

    it('should not use a user id supplied in the DTO', async () => {
      const request = {
        user: {
          id: 'authenticated-user',
        },
      };

      const dto = {
        orderId: 'order-1',
        userId: 'another-user',
      } as any;

      mockPaymentsService.createStripeIntent.mockResolvedValue({});

      await controller.createStripeIntent(request, dto);

      expect(mockPaymentsService.createStripeIntent).toHaveBeenCalledWith(
        'order-1',
        'authenticated-user',
      );
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Stripe intent error');

      const request = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        orderId: 'order-1',
      } as any;

      mockPaymentsService.createStripeIntent.mockRejectedValue(error);

      await expect(controller.createStripeIntent(request, dto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('stripeWebhook', () => {
    it('should pass raw body and Stripe signature to the service', async () => {
      const rawBody = Buffer.from('{"type":"payment_intent.succeeded"}');

      const signature = 'stripe-signature';

      const request = {
        rawBody,
      } as any;

      const expectedResult = {
        received: true,
      };

      mockPaymentsService.handleStripeWebhook.mockResolvedValue(expectedResult);

      const result = await controller.stripeWebhook(request, signature);

      expect(result).toEqual(expectedResult);

      expect(mockPaymentsService.handleStripeWebhook).toHaveBeenCalledWith(
        rawBody,
        signature,
      );

      expect(mockPaymentsService.handleStripeWebhook).toHaveBeenCalledTimes(1);
    });

    it('should use req.rawBody instead of the parsed request body', async () => {
      const rawBody = Buffer.from('{"id":"evt_123"}');

      const request = {
        rawBody,
        body: {
          id: 'different-value',
        },
      } as any;

      const signature = 'signature';

      mockPaymentsService.handleStripeWebhook.mockResolvedValue({});

      await controller.stripeWebhook(request, signature);

      expect(mockPaymentsService.handleStripeWebhook).toHaveBeenCalledWith(
        rawBody,
        signature,
      );
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Webhook processing error');

      const rawBody = Buffer.from('{"type":"test"}');

      const request = {
        rawBody,
      } as any;

      const signature = 'signature';

      mockPaymentsService.handleStripeWebhook.mockRejectedValue(error);

      await expect(
        controller.stripeWebhook(request, signature),
      ).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return all payments from the service', async () => {
      const expectedPayments = [
        {
          id: 'payment-1',
          status: 'paid',
        },
        {
          id: 'payment-2',
          status: 'pending',
        },
      ] as any[];

      mockPaymentsService.findAll.mockResolvedValue(expectedPayments);

      const result = await controller.findAll();

      expect(result).toEqual(expectedPayments);

      expect(mockPaymentsService.findAll).toHaveBeenCalledTimes(1);

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith();
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Failed to retrieve payments');

      mockPaymentsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
    });
  });

  describe('getPaymentById', () => {
    it('should get a payment by id', async () => {
      const paymentId = '550e8400-e29b-41d4-a716-446655440000';

      const expectedPayment = {
        id: paymentId,
        status: 'paid',
      } as any;

      mockPaymentsService.getPaymentById.mockResolvedValue(expectedPayment);

      const result = await controller.getPaymentById(paymentId);

      expect(result).toEqual(expectedPayment);

      expect(mockPaymentsService.getPaymentById).toHaveBeenCalledWith(
        paymentId,
      );

      expect(mockPaymentsService.getPaymentById).toHaveBeenCalledTimes(1);
    });

    it('should pass the exact id received from the route to the service', async () => {
      const paymentId = '550e8400-e29b-41d4-a716-446655440000';

      mockPaymentsService.getPaymentById.mockResolvedValue({});

      await controller.getPaymentById(paymentId);

      const receivedId = mockPaymentsService.getPaymentById.mock.calls[0][0];

      expect(receivedId).toBe(paymentId);
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Payment not found');

      const paymentId = '550e8400-e29b-41d4-a716-446655440000';

      mockPaymentsService.getPaymentById.mockRejectedValue(error);

      await expect(controller.getPaymentById(paymentId)).rejects.toThrow(error);
    });
  });

  describe('createAdminCheckoutSession', () => {
    it('should create a checkout session using the order id', async () => {
      const dto = {
        orderId: 'order-1',
      } as any;

      const expectedResult = {
        url: 'https://checkout.stripe.com/session-123',
      };

      mockPaymentsService.createAdminCheckoutSession.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createAdminCheckoutSession(dto);

      expect(result).toEqual(expectedResult);

      expect(
        mockPaymentsService.createAdminCheckoutSession,
      ).toHaveBeenCalledWith('order-1');

      expect(
        mockPaymentsService.createAdminCheckoutSession,
      ).toHaveBeenCalledTimes(1);
    });

    it('should use the orderId from the DTO', async () => {
      const dto = {
        orderId: 'order-123',
      } as any;

      mockPaymentsService.createAdminCheckoutSession.mockResolvedValue({});

      await controller.createAdminCheckoutSession(dto);

      expect(
        mockPaymentsService.createAdminCheckoutSession,
      ).toHaveBeenCalledWith('order-123');
    });

    it('should not pass the entire DTO to the service', async () => {
      const dto = {
        orderId: 'order-1',
        extraField: 'should-not-be-passed',
      } as any;

      mockPaymentsService.createAdminCheckoutSession.mockResolvedValue({});

      await controller.createAdminCheckoutSession(dto);

      expect(
        mockPaymentsService.createAdminCheckoutSession,
      ).toHaveBeenCalledWith('order-1');

      expect(
        mockPaymentsService.createAdminCheckoutSession,
      ).not.toHaveBeenCalledWith(dto);
    });

    it('should propagate errors from PaymentsService', async () => {
      const error = new Error('Checkout session error');

      const dto = {
        orderId: 'order-1',
      } as any;

      mockPaymentsService.createAdminCheckoutSession.mockRejectedValue(error);

      await expect(controller.createAdminCheckoutSession(dto)).rejects.toThrow(
        error,
      );
    });
  });
});
