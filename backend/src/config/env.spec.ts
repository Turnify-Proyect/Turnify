describe('env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default HOST when HOST is not defined', () => {
    delete process.env.HOST;

    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    const { env } = require('./env');

    expect(env.HOST).toBe('localhost');
  });

  it('should use default PORT when PORT is not defined', () => {
    delete process.env.PORT;

    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    const { env } = require('./env');

    expect(env.PORT).toBe(3000);
  });

  it('should use environment values when they are defined', () => {
    process.env.HOST = '0.0.0.0';
    process.env.PORT = '4000';
    process.env.DB_HOST = 'database';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'turnify';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'password';
    process.env.JWT_SECRET = 'jwt-secret';

    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    const { env } = require('./env');

    expect(env.HOST).toBe('0.0.0.0');
    expect(env.PORT).toBe(4000);
    expect(env.DB_HOST).toBe('database');
    expect(env.DB_PORT).toBe(5433);
    expect(env.DB_NAME).toBe('turnify');
    expect(env.DB_USERNAME).toBe('postgres');
    expect(env.DB_PASSWORD).toBe('password');
    expect(env.JWT_SECRET).toBe('jwt-secret');
  });

  it('should use default database host when DB_HOST is not defined', () => {
    delete process.env.DB_HOST;

    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    const { env } = require('./env');

    expect(env.DB_HOST).toBe('localhost');
  });

  it('should use default database port when DB_PORT is not defined', () => {
    delete process.env.DB_PORT;

    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    const { env } = require('./env');

    expect(env.DB_PORT).toBe(5432);
  });

  it('should allow optional environment variables to be undefined', () => {
    delete process.env.DB_NAME;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.JWT_SECRET;

    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    const { env } = require('./env');

    expect(env.DB_NAME).toBeUndefined();
    expect(env.DB_USERNAME).toBeUndefined();
    expect(env.DB_PASSWORD).toBeUndefined();
    expect(env.JWT_SECRET).toBeUndefined();
  });
});
