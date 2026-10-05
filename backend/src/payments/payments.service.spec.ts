import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';

import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const paymentRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const notificationsService = {
    sendOrderConfirmed: jest.fn(),
  };

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockProfessionalUnavailabilityRepository = {
    getOverlapping: jest.fn().mockResolvedValue(null),
  };

  const dataSource = {
    createQueryRunner: jest.fn(),
    getRepository: jest.fn(),
    transaction: jest.fn(),
  };

  const stripePaymentIntentsCreate = jest.fn();
  const stripeRefundsCreate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    queryRunner.isTransactionActive = true;

    dataSource.createQueryRunner.mockReturnValue(queryRunner);

    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn(),
    });

    dataSource.transaction.mockImplementation(
      async (callback: (manager: any) => Promise<any>) => {
        const manager = {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        };

        return callback(manager);
      },
    );

    /**
     * Importante:
     * PaymentsService utiliza el resultado de save(Payment, payment)
     * para acceder a savedPayment.id.
     *
     * Si el mock devuelve undefined:
     *
     *   savedPayment.id
     *
     * rompe con:
     *
     *   Cannot read properties of undefined (reading 'id')
     */
    queryRunner.manager.save.mockImplementation(
      async (entity: any, value: any) => {
        if (entity === Payment) {
          return {
            ...value,
            id: value.id ?? 'payment-1',
          };
        }

        return value;
      },
    );

    queryRunner.manager.create.mockImplementation(
      (_entity: any, value: any) => value,
    );

    stripePaymentIntentsCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_secret',
    });

    stripeRefundsCreate.mockResolvedValue({
      id: 're_test_123',
      status: 'succeeded',
    });

    notificationsService.sendOrderConfirmed.mockResolvedValue(undefined);

    await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: 'PaymentRepository',
          useValue: paymentRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    })

      .overrideProvider('PaymentRepository')
      .useValue(paymentRepository)
      .compile()
      .then((module: TestingModule) => {
        service = module.get<PaymentsService>(PaymentsService);
      });

    /**
     * Reemplazamos Stripe internamente para que ningún test
     * realice llamadas a la API de Stripe.
     */
    (service as any).stripe = {
      paymentIntents: {
        create: stripePaymentIntentsCreate,
      },
      refunds: {
        create: stripeRefundsCreate,
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };
  });

  const createAppointment = (
    overrides: Partial<Appointment> = {},
  ): Appointment => {
    return {
      id: 'appointment-1',
      status: AppointmentStatus.PENDING,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      // Mocks requeridos por la sección de emails en el servicio:
      service: { name: 'Servicio de Prueba', durationMinutes: 60 },
      professional: { user: { name: 'Profesional de Prueba' } },
      ...overrides,
    } as Appointment;
  };

  const createOrder = (overrides: Partial<Order> = {}): Order => {
    const appointment = createAppointment();

    return {
      order_id: 'order-1',
      status: OrderStatus.PENDING,
      orderDetails: {
        total_price: '123.45',
        appointments: [appointment],
      },
      user: {
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@example.com',
      },
      ...overrides,
    } as Order;
  };

  const createPayment = (overrides: Partial<Payment> = {}): Payment => {
    // Generamos una orden válida por defecto para que tenga todas las relaciones
    const defaultOrder = createOrder();

    return {
      id: 'payment-1',
      amount: '37.04',
      provider: 'stripe',
      status: PaymentStatus.PAID,
      externalPaymentId: 'pi_test_123',
      paidAt: new Date(),
      order: defaultOrder, // <-- AGREGAMOS ESTO para solucionar el error de orderDetails
      ...overrides,
    } as Payment;
  };

  describe('processPayment', () => {
    it('should process a payment successfully', async () => {
      const appointment = createAppointment();

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const payment = createPayment({
        status: PaymentStatus.PAID,
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      queryRunner.manager.create.mockReturnValue(payment);

      queryRunner.manager.save.mockImplementation(
        async (entity: any, value: any) => {
          if (entity === Payment) {
            return {
              ...value,
              id: value.id ?? 'payment-1',
            };
          }

          return value;
        },
      );

      paymentRepository.findOne.mockResolvedValue(payment);

      const result = await service.processPayment({
        orderId: 'order-1',
        amount: 37.04,
        provider: 'stripe',
        externalPaymentId: 'pi_test_123',
        status: PaymentStatus.PAID,
      });

      expect(result).toBe(payment);

      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          status: OrderStatus.PAID,
        }),
      );

      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        Appointment,
        expect.objectContaining({
          status: AppointmentStatus.CONFIRMED,
          expiresAt: null,
        }),
      );

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should return the existing payment when the same paid webhook is received again', async () => {
      const order = createOrder();

      const payment = createPayment({
        status: PaymentStatus.PAID,
        externalPaymentId: 'pi_test_123',
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(payment);

      const result = await service.processPayment({
        orderId: 'order-1',
        amount: 37.04,
        provider: 'stripe',
        externalPaymentId: 'pi_test_123',
        status: PaymentStatus.PAID,
      });

      expect(result).toBe(payment);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should throw when the order does not exist', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when the order already has a different paid payment', async () => {
      const order = createOrder();

      const payment = createPayment({
        status: PaymentStatus.PAID,
        externalPaymentId: 'pi_other',
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(payment);

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow('La orden ya posee un pago confirmado');
    });

    it('should throw when the order has no appointments', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [],
        },
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow('La orden no tiene turnos asociados');
    });

    it('should throw when an appointment has expired', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.EXPIRED,
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow(
        'No se puede confirmar el pago porque el turno asociado ya expiró',
      );
    });

    it('should throw when a pending appointment has passed its expiration date', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow(
        'No se puede confirmar el pago porque el turno asociado ya expiró',
      );
    });

    it('should throw when an appointment is cancelled', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CANCELLED,
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow('No se puede confirmar el pago de un turno cancelado');
    });

    it('should update an existing unpaid payment', async () => {
      const order = createOrder();

      const existingPayment = createPayment({
        status: PaymentStatus.PENDING,
        externalPaymentId: null,
      });

      const savedPayment = {
        ...existingPayment,
        status: PaymentStatus.PAID,
        externalPaymentId: 'pi_test_123',
        amount: '37.04',
      };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(existingPayment);

      queryRunner.manager.save.mockImplementation(
        async (entity: any, value: any) => {
          if (entity === Payment) {
            return {
              ...savedPayment,
              ...value,
              id: value.id ?? 'payment-1',
            };
          }

          return value;
        },
      );

      paymentRepository.findOne.mockResolvedValue(savedPayment);

      const result = await service.processPayment({
        orderId: 'order-1',
        amount: 37.04,
        provider: 'stripe',
        externalPaymentId: 'pi_test_123',
        status: PaymentStatus.PAID,
      });

      expect(result).toBe(savedPayment);

      expect(existingPayment.status).toBe(PaymentStatus.PAID);
      expect(existingPayment.externalPaymentId).toBe('pi_test_123');
      expect(existingPayment.amount).toBe('37.04');
    });

    it('should return a BadRequestException when an unexpected error occurs', async () => {
      const order = createOrder();

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).rejects.toThrow('Error al procesar el pago: Database error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should not fail the payment when confirmation email fails', async () => {
      const appointment = createAppointment();

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const savedPayment = createPayment();

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      queryRunner.manager.create.mockReturnValue(savedPayment);

      queryRunner.manager.save.mockImplementation(
        async (entity: any, value: any) => {
          if (entity === Payment) {
            return {
              ...value,
              id: value.id ?? 'payment-1',
            };
          }

          return value;
        },
      );

      paymentRepository.findOne.mockResolvedValue(savedPayment);

      notificationsService.sendOrderConfirmed.mockRejectedValue(
        new Error('Email error'),
      );

      await expect(
        service.processPayment({
          orderId: 'order-1',
          amount: 37.04,
          provider: 'stripe',
          externalPaymentId: 'pi_test_123',
          status: PaymentStatus.PAID,
        }),
      ).resolves.toBe(savedPayment);

      expect(notificationsService.sendOrderConfirmed).toHaveBeenCalled();
    });
  });

  describe('createStripeIntent', () => {
    it('should create a Stripe PaymentIntent', async () => {
      const order = createOrder();

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      const result = await service.createStripeIntent('order-1', 'user-1');

      expect(stripePaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3703,
          currency: 'ars',
          metadata: {
            orderId: 'order-1',
          },
        }),
        {
          idempotencyKey: 'turnify-order-order-1',
        },
      );

      expect(result).toEqual({
        clientSecret: 'pi_test_secret',
      });
    });

    it('should throw when the order does not exist', async () => {
      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(null);

      await expect(
        service.createStripeIntent('order-1', 'user-1'),
      ).rejects.toThrow(
        'La orden no existe o no pertenece al usuario autenticado',
      );
    });

    it('should throw when the order is not pending', async () => {
      const order = createOrder({
        status: OrderStatus.PAID,
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      await expect(
        service.createStripeIntent('order-1', 'user-1'),
      ).rejects.toThrow('La orden no se encuentra pendiente de pago');
    });

    it('should throw when the order has no appointments', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [],
        },
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      await expect(
        service.createStripeIntent('order-1', 'user-1'),
      ).rejects.toThrow('La orden no tiene turnos asociados');
    });

    it('should throw when an appointment is expired', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      await expect(
        service.createStripeIntent('order-1', 'user-1'),
      ).rejects.toThrow(
        'La reserva asociada a la orden ya no se encuentra disponible para pagar',
      );
    });

    it('should throw when appointment is not pending', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
        expiresAt: new Date(Date.now() + 60 * 1000),
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      await expect(
        service.createStripeIntent('order-1', 'user-1'),
      ).rejects.toThrow(
        'La reserva asociada a la orden ya no se encuentra disponible para pagar',
      );
    });
  });

  describe('handleStripeWebhook', () => {
    const createWebhookEvent = (
      overrides: Partial<Stripe.PaymentIntent> = {},
    ) => {
      return {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount_received: 3704,
            metadata: {
              orderId: 'order-1',
            },
            ...overrides,
          },
        },
      } as unknown as Stripe.Event;
    };

    it('should reject an invalid Stripe signature', async () => {
      const constructEvent = jest.fn(() => {
        throw new Error('Invalid signature');
      });

      (service as any).stripe.webhooks.constructEvent = constructEvent;

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'invalid-signature'),
      ).rejects.toThrow('Firma de webhook inválida');
    });

    it('should ignore a succeeded event without a valid Turnify order id', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(
        () =>
          ({
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_123',
                amount_received: 3704,
                metadata: {},
              },
            },
          }) as Stripe.Event,
      );

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toEqual({
        received: true,
      });
    });

    it('should ignore a test payment intent id used as order id', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(
        () =>
          ({
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_123',
                amount_received: 3704,
                metadata: {
                  orderId: 'pi_test_fake',
                },
              },
            },
          }) as Stripe.Event,
      );

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toEqual({
        received: true,
      });
    });

    it('should throw when the order from the webhook does not exist', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(() =>
        createWebhookEvent(),
      );

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(null);

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).rejects.toThrow('No se encontró la orden con ID: order-1');
    });

    it('should process a valid payment webhook', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(() =>
        createWebhookEvent(),
      );

      const appointment = createAppointment();

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      queryRunner.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      const savedPayment = createPayment();

      queryRunner.manager.create.mockReturnValue(savedPayment);

      queryRunner.manager.save.mockImplementation(
        async (entity: any, value: any) => {
          if (entity === Payment) {
            return {
              ...value,
              id: value.id ?? 'payment-1',
            };
          }

          return value;
        },
      );

      paymentRepository.findOne.mockResolvedValue(savedPayment);

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toEqual({
        received: true,
      });

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should refund an expired reservation', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(() =>
        createWebhookEvent(),
      );

      const appointment = createAppointment({
        status: AppointmentStatus.EXPIRED,
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toEqual({
        received: true,
      });

      expect(stripeRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_test_123',
        },
        {
          idempotencyKey: 'turnify-refund-pi_test_123',
        },
      );
    });

    it('should refund a cancelled reservation', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(() =>
        createWebhookEvent(),
      );

      const appointment = createAppointment({
        status: AppointmentStatus.CANCELLED,
      });

      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [appointment],
        },
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toEqual({
        received: true,
      });

      expect(stripeRefundsCreate).toHaveBeenCalled();
    });

    it('should use processPayment when the order is already paid', async () => {
      (service as any).stripe.webhooks.constructEvent = jest.fn(() =>
        createWebhookEvent(),
      );

      const order = createOrder({
        status: OrderStatus.PAID,
      });

      const repository = dataSource.getRepository();

      repository.findOne.mockResolvedValue(order);

      const processPaymentSpy = jest
        .spyOn(service, 'processPayment')
        .mockResolvedValue(createPayment());

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toEqual({
        received: true,
      });

      expect(processPaymentSpy).toHaveBeenCalledWith({
        orderId: 'order-1',
        amount: 37.04,
        provider: 'stripe',
        externalPaymentId: 'pi_test_123',
        status: PaymentStatus.PAID,
      });
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      const payment = createPayment();

      paymentRepository.findOne.mockResolvedValue(payment);

      const result = await service.getPaymentById('payment-1');

      expect(result).toBe(payment);
      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'payment-1',
        },
        relations: [
          'order',
          'order.orderDetails',
          'order.orderDetails.appointments',
        ],
      });
    });

    it('should throw when payment does not exist', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentById('payment-1')).rejects.toThrow(
        'No se encontró un registro de pago con el ID proporcionado',
      );
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      const payments = [
        createPayment(),
        createPayment({
          id: 'payment-2',
        }),
      ];

      paymentRepository.find.mockResolvedValue(payments);

      const result = await service.findAll();

      expect(result).toBe(payments);

      expect(paymentRepository.find).toHaveBeenCalledWith({
        relations: ['order'],
      });
    });
  });

  describe('getOrderDeposit', () => {
    it('should calculate 30 percent of the order total', () => {
      const order = createOrder({
        orderDetails: {
          total_price: '100.00',
          appointments: [],
        },
      });

      const result = (service as any).getOrderDeposit(order);

      expect(result).toBe(30);
    });

    it('should round the deposit to two decimal places', () => {
      const order = createOrder({
        orderDetails: {
          total_price: '123.4666666667',
          appointments: [],
        },
      });

      const result = (service as any).getOrderDeposit(order);

      expect(result).toBe(37.04);
    });

    it('should throw when the order total is invalid', () => {
      const order = createOrder({
        orderDetails: {
          total_price: 'invalid',
          appointments: [],
        },
      });

      expect(() => (service as any).getOrderDeposit(order)).toThrow(
        'La orden no tiene un precio válido',
      );
    });

    it('should throw when the order total is zero', () => {
      const order = createOrder({
        orderDetails: {
          total_price: '0',
          appointments: [],
        },
      });

      expect(() => (service as any).getOrderDeposit(order)).toThrow(
        'La orden no tiene un precio válido',
      );
    });
  });

  describe('getOrderTotal', () => {
    it('should return the order total', () => {
      const order = createOrder({
        orderDetails: {
          total_price: '123.45',
          appointments: [],
        },
      });

      const result = (service as any).getOrderTotal(order);

      expect(result).toBe(123.45);
    });

    it('should sum multiple order details', () => {
      const order = createOrder({
        orderDetails: {
          total_price: '300.50',
          appointments: [],
        },
      });

      const result = (service as any).getOrderTotal(order);

      expect(result).toBe(300.5);
    });

    it('should throw when the total is invalid', () => {
      const order = createOrder({
        orderDetails: {
          total_price: 'invalid',
          appointments: [],
        },
      });

      expect(() => (service as any).getOrderTotal(order)).toThrow(
        'La orden no tiene un precio válido',
      );
    });

    it('should throw when the total is zero', () => {
      const order = createOrder({
        orderDetails: {
          total_price: '0',
          appointments: [],
        },
      });

      expect(() => (service as any).getOrderTotal(order)).toThrow(
        'La orden no tiene un precio válido',
      );
    });
  });
});
