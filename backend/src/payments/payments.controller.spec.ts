import { Test, TestingModule } from '@nestjs/testing';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const paymentsService = {
    processPayment: jest.fn(),
    createStripeIntent: jest.fn(),
    handleStripeWebhook: jest.fn(),
    findAll: jest.fn(),
    getPaymentById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsService,
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
    it('should process a payment', async () => {
      const dto = {
        orderId: 'order-1',
        paymentId: 'payment-1',
      };

      const payment = {
        id: 'payment-1',
        status: 'approved',
      };

      paymentsService.processPayment.mockResolvedValue(payment);

      const result = await controller.processPayment(dto as any);

      expect(result).toEqual(payment);
      expect(paymentsService.processPayment).toHaveBeenCalledWith(dto);
      expect(paymentsService.processPayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('createStripeIntent', () => {
    it('should create a Stripe payment intent using the authenticated user id', async () => {
      const req = {
        user: {
          id: 'user-1',
        },
      };

      const dto = {
        orderId: 'order-1',
      };

      const response = {
        clientSecret: 'pi_secret_123',
      };

      paymentsService.createStripeIntent.mockResolvedValue(response);

      const result = await controller.createStripeIntent(req, dto as any);

      expect(result).toEqual(response);

      expect(
        paymentsService.createStripeIntent,
      ).toHaveBeenCalledWith('order-1', 'user-1');

      expect(
        paymentsService.createStripeIntent,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('stripeWebhook', () => {
    it('should handle the Stripe webhook', async () => {
      const rawBody = Buffer.from(
        JSON.stringify({
          type: 'payment_intent.succeeded',
        }),
      );

      const req = {
        rawBody,
      } as any;

      const signature = 'stripe-signature';

      const response = {
        received: true,
      };

      paymentsService.handleStripeWebhook.mockResolvedValue(response);

      const result = await controller.stripeWebhook(req, signature);

      expect(result).toEqual(response);

      expect(
        paymentsService.handleStripeWebhook,
      ).toHaveBeenCalledWith(rawBody, signature);

      expect(
        paymentsService.handleStripeWebhook,
      ).toHaveBeenCalledTimes(1);
    });

    it('should pass the exact raw body and Stripe signature to the service', async () => {
      const rawBody = Buffer.from('raw-stripe-payload');

      const req = {
        rawBody,
      } as any;

      const signature = 't=123,v1=abc';

      paymentsService.handleStripeWebhook.mockResolvedValue({
        received: true,
      });

      await controller.stripeWebhook(req, signature);

      expect(
        paymentsService.handleStripeWebhook,
      ).toHaveBeenCalledWith(rawBody, signature);
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      const payments = [
        {
          id: 'payment-1',
          status: 'approved',
        },
        {
          id: 'payment-2',
          status: 'pending',
        },
      ];

      paymentsService.findAll.mockResolvedValue(payments);

      const result = await controller.findAll();

      expect(result).toEqual(payments);
      expect(paymentsService.findAll).toHaveBeenCalledTimes(1);
      expect(paymentsService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      const payment = {
        id: 'payment-1',
        status: 'approved',
      };

      paymentsService.getPaymentById.mockResolvedValue(payment);

      const result = await controller.getPaymentById('payment-1');

      expect(result).toEqual(payment);

      expect(
        paymentsService.getPaymentById,
      ).toHaveBeenCalledWith('payment-1');

      expect(
        paymentsService.getPaymentById,
      ).toHaveBeenCalledTimes(1);
    });
  });
});