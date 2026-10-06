import { typeOrmConfig } from '../config/typeorm';

describe('typeOrmConfig', () => {
  it('should have the correct PostgreSQL configuration', () => {
    const config = typeOrmConfig();

    expect(config).toEqual(
      expect.objectContaining({
        type: 'postgres',
        host: expect.any(String),
        port: expect.any(Number),
        database: expect.anything(),
        username: expect.anything(),
        password: expect.anything(),
        entities: ['dist/**/*.entity{.ts,.js}'],
        migrations: ['dist/migrations/*{.ts,.js}'],
        autoLoadEntities: true,
        logging: true,
        synchronize: true,
        dropSchema: false,
      }),
    );
  });

  it('should configure SSL according to the environment', () => {
    const config = typeOrmConfig();

    if (
      process.env.DB_SSL === 'true' ||
      process.env.NODE_ENV === 'production'
    ) {
      expect(config.ssl).toEqual({
        rejectUnauthorized: false,
      });
    } else {
      expect(config.ssl).toBe(false);
    }
  });

  it('should have the expected entity and migration paths', () => {
    const config = typeOrmConfig();

    expect(config.entities).toEqual([
      'dist/**/*.entity{.ts,.js}',
    ]);

    expect(config.migrations).toEqual([
      'dist/migrations/*{.ts,.js}',
    ]);
  });
});
