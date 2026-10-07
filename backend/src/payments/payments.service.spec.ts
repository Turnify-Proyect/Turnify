import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  Payment,
  PaymentStatus,
  PaymentType,
} from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;

  let paymentRepositoryMock: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  let notificationsServiceMock: {
    sendOrderConfirmed: jest.Mock;
    sendPaymentLink: jest.Mock;
  };

  let queryRunnerMock: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    isTransactionActive: boolean;
    manager: {
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
  };

  let dataSourceMock: {
    createQueryRunner: jest.Mock;
    getRepository: jest.Mock;
    transaction: jest.Mock;
  };

  const stripeMock = {
    paymentIntents: {
      create: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  const orderId = 'order-123';
  const userId = 'user-123';

  const createAppointment = (
    overrides: Partial<Appointment> = {},
  ): Appointment => {
    return {
      id: 'appointment-123',
      user: {} as any,
      professional: {
        user: {
          name: 'Dr. Test',
        },
      } as any,
      service: {
        name: 'Consulta',
        durationMinutes: 60,
      } as any,
      orderDetail: {} as any,
      startAt: new Date('2026-10-10T10:00:00.000Z'),
      endAt: new Date('2026-10-10T11:00:00.000Z'),
      status: AppointmentStatus.PENDING,
      rescheduleCount: 0,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      reminderSent: false,
      ...overrides,
    };
  };

  const createOrder = (
    overrides: Partial<Order> = {},
  ): Order => {
    const appointment = createAppointment();

    return {
      order_id: orderId,
      status: OrderStatus.PENDING,
      created_at: new Date(),
      user: {
        id: userId,
        name: 'Juan Pérez',
        email: 'juan@test.com',
      } as any,
      orderDetails: {
        total_price: '10000',
        appointments: [appointment],
      } as any,
      payment: null,
      ...overrides,
    };
  };

  const createPayment = (
    overrides: Partial<Payment> = {},
  ): Payment => {
    return {
      id: 'payment-123',
      order: createOrder(),
      provider: 'stripe',
      externalPaymentId: 'pi_123',
      amount: '3000',
      paymentType: PaymentType.DEPOSIT_PAYMENT,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
      createdAt: new Date(),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queryRunnerMock = {
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

    paymentRepositoryMock = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    notificationsServiceMock = {
      sendOrderConfirmed: jest.fn(),
      sendPaymentLink: jest.fn(),
    };

    dataSourceMock = {
      createQueryRunner: jest.fn(() => queryRunnerMock),
      getRepository: jest.fn(() => paymentRepositoryMock),
      transaction: jest.fn(),
    };

    service = new PaymentsService(
      paymentRepositoryMock as any,
      dataSourceMock as any,
      notificationsServiceMock as any,
    );

    /*
     * PaymentsService instancia Stripe internamente.
     * Reemplazamos esa instancia por nuestro mock.
     */
    (service as any).stripe = stripeMock;

    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  describe('processPayment', () => {
    const dto = {
      orderId,
      amount: 3000,
      provider: 'stripe',
      externalPaymentId: 'pi_123',
      status: PaymentStatus.PAID,
      paymentType: PaymentType.DEPOSIT_PAYMENT,
    };

    it('should process a new paid payment successfully', async () => {
      const order = createOrder();

      const savedPayment = createPayment({
        id: 'payment-123',
        order,
      });

      const updatedPayment = createPayment({
        id: 'payment-123',
        order: {
          ...order,
          status: OrderStatus.PAID,
        } as Order,
      });

queryRunnerMock.manager.findOne
  .mockResolvedValueOnce(order)
  .mockResolvedValueOnce(null);

queryRunnerMock.manager.create.mockReturnValue(savedPayment);

queryRunnerMock.manager.save
  .mockResolvedValueOnce(order)
  .mockResolvedValueOnce(order.orderDetails.appointments[0])
  .mockResolvedValueOnce(savedPayment);

paymentRepositoryMock.findOne.mockResolvedValue(updatedPayment);


      notificationsServiceMock.sendOrderConfirmed.mockResolvedValue(undefined);

      const result = await service.processPayment(dto);

      expect(result).toBe(updatedPayment);

      expect(queryRunnerMock.connect).toHaveBeenCalled();
      expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.rollbackTransaction).not.toHaveBeenCalled();

      expect(queryRunnerMock.manager.create).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          order,
          amount: '3000',
          provider: 'stripe',
          status: PaymentStatus.PAID,
          externalPaymentId: 'pi_123',
          paymentType: PaymentType.DEPOSIT_PAYMENT,
        }),
      );

      expect(order.status).toBe(OrderStatus.PAID);

      expect(order.orderDetails.appointments[0].status).toBe(
        AppointmentStatus.CONFIRMED,
      );

      expect(order.orderDetails.appointments[0].expiresAt).toBeNull();

      expect(notificationsServiceMock.sendOrderConfirmed).toHaveBeenCalled();

      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it('should throw when the order does not exist', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(null);

      await expect(
        service.processPayment(dto),
      ).rejects.toThrow(NotFoundException);

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it('should return the existing payment when the same paid payment is processed again', async () => {
      const order = createOrder();

      const existingPayment = createPayment({
        order,
        status: PaymentStatus.PAID,
        externalPaymentId: 'pi_123',
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(existingPayment);

      const result = await service.processPayment(dto);

      expect(result).toBe(existingPayment);

      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();

      expect(queryRunnerMock.manager.create).not.toHaveBeenCalled();
      expect(queryRunnerMock.manager.save).not.toHaveBeenCalled();

      expect(notificationsServiceMock.sendOrderConfirmed).not.toHaveBeenCalled();
    });

    it('should reject a different payment when the order already has a paid payment', async () => {
      const order = createOrder();

      const existingPayment = createPayment({
        order,
        status: PaymentStatus.PAID,
        externalPaymentId: 'pi_old',
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(existingPayment);

      await expect(
        service.processPayment({
          ...dto,
          externalPaymentId: 'pi_new',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it('should reject a payment when the order has no appointments', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [],
        } as any,
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment(dto),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject a payment when an appointment is expired', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.EXPIRED,
        expiresAt: null,
      });

      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [appointment],
        } as any,
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment(dto),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject a payment when a pending appointment has expired', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
        expiresAt: new Date(Date.now() - 60_000),
      });

      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [appointment],
        } as any,
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment(dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a payment when an appointment is cancelled', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CANCELLED,
      });

      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [appointment],
        } as any,
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      await expect(
        service.processPayment(dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not fail the payment when the confirmation email fails', async () => {
      const order = createOrder();

      const savedPayment = createPayment({ order });

      const updatedPayment = createPayment({
        order: {
          ...order,
          status: OrderStatus.PAID,
        } as Order,
      });

      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      queryRunnerMock.manager.create.mockReturnValue(savedPayment);

queryRunnerMock.manager.save
  .mockResolvedValueOnce(order)
  .mockResolvedValueOnce(order.orderDetails.appointments[0])
  .mockResolvedValueOnce(savedPayment);


      paymentRepositoryMock.findOne.mockResolvedValue(updatedPayment);

      notificationsServiceMock.sendOrderConfirmed.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.processPayment(dto);

      expect(result).toBe(updatedPayment);
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('processCashPayment', () => {
    it('should process a deposit cash payment', async () => {
      const order = createOrder();

      const processPaymentSpy = jest
        .spyOn(service, 'processPayment')
        .mockResolvedValue(createPayment());

      paymentRepositoryMock.findOne.mockResolvedValue(order);

      const dto = {
        orderId,
        paymentType: PaymentType.DEPOSIT_PAYMENT,
      };

      await service.processCashPayment(dto);

      expect(processPaymentSpy).toHaveBeenCalledWith({
        orderId,
        amount: 3000,
        provider: 'cash',
        externalPaymentId: undefined,
        status: PaymentStatus.PAID,
        paymentType: PaymentType.DEPOSIT_PAYMENT,
      });
    });

    it('should process a full cash payment', async () => {
      const order = createOrder();

      const processPaymentSpy = jest
        .spyOn(service, 'processPayment')
        .mockResolvedValue(createPayment());

      paymentRepositoryMock.findOne.mockResolvedValue(order);

      const dto = {
        orderId,
        paymentType: PaymentType.FULL_PAYMENT,
      };

      await service.processCashPayment(dto);

      expect(processPaymentSpy).toHaveBeenCalledWith({
        orderId,
        amount: 10000,
        provider: 'cash',
        externalPaymentId: undefined,
        status: PaymentStatus.PAID,
        paymentType: PaymentType.FULL_PAYMENT,
      });
    });

    it('should throw when the order does not exist', async () => {
      paymentRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.processCashPayment({
          orderId,
          paymentType: PaymentType.DEPOSIT_PAYMENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createStripeIntent', () => {
    it('should create a Stripe PaymentIntent using the authenticated user', async () => {
      const order = createOrder();

      paymentRepositoryMock.findOne.mockResolvedValue(order);

      /*
       * createStripeIntent usa:
       * this.dataSource.getRepository(Order).findOne(...)
       *
       * Por eso usamos un repository específico para Order.
       */
      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockImplementation(
        (entity: any) => {
          if (entity === Order) {
            return orderRepositoryMock;
          }

          return paymentRepositoryMock;
        },
      );

      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      });

      const result = await service.createStripeIntent(
        orderId,
        userId,
      );

      expect(result).toEqual({
        clientSecret: 'secret_123',
      });

      expect(orderRepositoryMock.findOne).toHaveBeenCalledWith({
        where: {
          order_id: orderId,
          user: {
            id: userId,
          },
        },
        relations: [
          'user',
          'orderDetails',
          'orderDetails.appointments',
        ],
      });

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 300000,
          currency: 'ars',
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            orderId,
          },
        }),
        {
          idempotencyKey: `turnify-order-${orderId}`,
        },
      );
    });

    it('should throw when the order does not belong to the authenticated user', async () => {
      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createStripeIntent(orderId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(
        stripeMock.paymentIntents.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject a non-pending order', async () => {
      const order = createOrder({
        status: OrderStatus.PAID,
      });

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createStripeIntent(orderId, userId),
      ).rejects.toThrow(BadRequestException);

      expect(
        stripeMock.paymentIntents.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject an order without appointments', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [],
        } as any,
      });

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createStripeIntent(orderId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an expired appointment', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [
            createAppointment({
              expiresAt: new Date(Date.now() - 60_000),
            }),
          ],
        } as any,
      });

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createStripeIntent(orderId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleStripeWebhook', () => {
    const createStripeEvent = (
      overrides: Partial<any> = {},
    ) => ({
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount_received: 300000,
          metadata: {
            orderId,
          },
        },
      },
      ...overrides,
    });

    it('should reject an invalid Stripe signature', async () => {
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleStripeWebhook(
          Buffer.from('raw-body'),
          'invalid-signature',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ignore events without a valid orderId', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue(
        createStripeEvent({
          data: {
            object: {
              id: 'pi_test',
              amount_received: 300000,
              metadata: {},
            },
          },
        }),
      );

      const result = await service.handleStripeWebhook(
        Buffer.from('raw-body'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });
    });

    it('should ignore generic Stripe test payment intent ids', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue(
        createStripeEvent({
          data: {
            object: {
              id: 'pi_test',
              amount_received: 300000,
              metadata: {
                orderId: 'pi_test',
              },
            },
          },
        }),
      );

      const result = await service.handleStripeWebhook(
        Buffer.from('raw-body'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });
    });

    it('should ignore non-payment_intent.succeeded events', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue(
        createStripeEvent({
          type: 'payment_intent.created',
        }),
      );

      const result = await service.handleStripeWebhook(
        Buffer.from('raw-body'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });
    });

    it('should throw when the order does not exist', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue(
        createStripeEvent(),
      );

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.handleStripeWebhook(
          Buffer.from('raw-body'),
          'signature',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should process a valid payment through processPayment', async () => {
      const order = createOrder();

      stripeMock.webhooks.constructEvent.mockReturnValue(
        createStripeEvent(),
      );

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      const processPaymentSpy = jest
        .spyOn(service, 'processPayment')
        .mockResolvedValue(createPayment());

      const result = await service.handleStripeWebhook(
        Buffer.from('raw-body'),
        'signature',
      );

      expect(processPaymentSpy).toHaveBeenCalledWith({
        orderId,
        amount: 3000,
        provider: 'stripe',
        externalPaymentId: 'pi_123',
        status: PaymentStatus.PAID,
        paymentType: PaymentType.DEPOSIT_PAYMENT,
      });

      expect(result).toEqual({
        received: true,
      });
    });

    it('should refund the payment when the reservation expired', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [
            createAppointment({
              expiresAt: new Date(Date.now() - 60_000),
            }),
          ],
        } as any,
      });

      stripeMock.webhooks.constructEvent.mockReturnValue(
        createStripeEvent(),
      );

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      dataSourceMock.transaction.mockImplementation(
        async (callback: any) => {
          const manager = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn((_, entity) => entity),
            save: jest.fn().mockResolvedValue(undefined),
          };

          return callback(manager);
        },
      );

      stripeMock.refunds.create.mockResolvedValue({
        id: 're_123',
      });

      const result = await service.handleStripeWebhook(
        Buffer.from('raw-body'),
        'signature',
      );

      expect(stripeMock.refunds.create).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_123',
        },
        {
          idempotencyKey: 'turnify-refund-pi_123',
        },
      );

      expect(result).toEqual({
        received: true,
      });
    });
  });

  describe('getPaymentById', () => {
    it('should return the payment when it exists', async () => {
      const payment = createPayment();

      paymentRepositoryMock.findOne.mockResolvedValue(payment);

      const result = await service.getPaymentById('payment-123');

      expect(result).toBe(payment);

      expect(paymentRepositoryMock.findOne).toHaveBeenCalledWith({
        where: {
          id: 'payment-123',
        },
        relations: [
          'order',
          'order.orderDetails',
          'order.orderDetails.appointments',
        ],
      });
    });

    it('should throw when the payment does not exist', async () => {
      paymentRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.getPaymentById('payment-404'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      const payments = [
        createPayment(),
        createPayment({
          id: 'payment-456',
        }),
      ];

      paymentRepositoryMock.find.mockResolvedValue(payments);

      const result = await service.findAll();

      expect(result).toBe(payments);

      expect(paymentRepositoryMock.find).toHaveBeenCalledWith({
        relations: ['order'],
      });
    });
  });

  describe('createAdminCheckoutSession', () => {
    const createValidOrder = () => {
      return createOrder();
    };

    it('should create an admin checkout session successfully', async () => {
      const order = createValidOrder();

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      dataSourceMock.transaction.mockImplementation(
        async (callback: any) => {
          const manager = {
            save: jest.fn().mockResolvedValue(undefined),
          };

          return callback(manager);
        },
      );

      notificationsServiceMock.sendPaymentLink.mockResolvedValue(
        undefined,
      );

      const result =
        await service.createAdminCheckoutSession(orderId);

      expect(result.orderId).toBe(orderId);
      expect(result.checkoutUrl).toBe(
        'https://checkout.stripe.com/test',
      );
      expect(result.email).toBe('juan@test.com');
      expect(result.depositAmount).toBe(3000);
      expect(result.emailSent).toBe(true);

      expect(
        stripeMock.checkout.sessions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer_email: 'juan@test.com',
          client_reference_id: orderId,
          metadata: {
            orderId,
          },
          payment_intent_data: {
            metadata: {
              orderId,
            },
          },
          line_items: [
            {
              price_data: expect.objectContaining({
                currency: 'ars',
                unit_amount: 300000,
              }),
              quantity: 1,
            },
          ],
        }),
        {
          idempotencyKey:
            `turnify-admin-checkout-${orderId}`,
        },
      );

      expect(
        notificationsServiceMock.sendPaymentLink,
      ).toHaveBeenCalled();

      expect(
        order.orderDetails.appointments[0].expiresAt,
      ).toEqual(expect.any(Date));
    });

    it('should throw when the order does not exist', async () => {
      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createAdminCheckoutSession(orderId),
      ).rejects.toThrow(NotFoundException);

      expect(
        stripeMock.checkout.sessions.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject a non-pending order', async () => {
      const order = createOrder({
        status: OrderStatus.PAID,
      });

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createAdminCheckoutSession(orderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an order without appointments', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [],
        } as any,
      });

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createAdminCheckoutSession(orderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an expired appointment', async () => {
      const order = createOrder({
        orderDetails: {
          total_price: '10000',
          appointments: [
            createAppointment({
              expiresAt: new Date(Date.now() - 60_000),
            }),
          ],
        } as any,
      });

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      await expect(
        service.createAdminCheckoutSession(orderId),
      ).rejects.toThrow(BadRequestException);

      expect(
        stripeMock.checkout.sessions.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject when FRONTEND_URL is not configured', async () => {
      const order = createValidOrder();

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      delete process.env.FRONTEND_URL;

      await expect(
        service.createAdminCheckoutSession(orderId),
      ).rejects.toThrow(BadRequestException);

      expect(
        stripeMock.checkout.sessions.create,
      ).not.toHaveBeenCalled();
    });

    it('should return emailSent false when sending the payment link fails', async () => {
      const order = createValidOrder();

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      dataSourceMock.transaction.mockImplementation(
        async (callback: any) => {
          const manager = {
            save: jest.fn().mockResolvedValue(undefined),
          };

          return callback(manager);
        },
      );

      notificationsServiceMock.sendPaymentLink.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result =
        await service.createAdminCheckoutSession(orderId);

      expect(result.emailSent).toBe(false);
      expect(result.checkoutUrl).toBe(
        'https://checkout.stripe.com/test',
      );
    });

    it('should throw when Stripe does not generate a checkout URL', async () => {
      const order = createValidOrder();

      const orderRepositoryMock = {
        findOne: jest.fn().mockResolvedValue(order),
      };

      dataSourceMock.getRepository.mockReturnValue(
        orderRepositoryMock,
      );

      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: null,
      });

      await expect(
        service.createAdminCheckoutSession(orderId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
