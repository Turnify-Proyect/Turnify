import { ValidationArguments } from 'class-validator';
import { MatchPassword } from './matchPassword.decorator';

describe('MatchPassword', () => {
  let validator: MatchPassword;

  beforeEach(() => {
    validator = new MatchPassword();
  });

  describe('validate', () => {
    it('should return true when passwords match', () => {
      const args = {
        object: {
          password_hash: 'password123',
        },
        constraints: ['password_hash'],
      } as ValidationArguments;

      const result = validator.validate('password123', args);

      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', () => {
      const args = {
        object: {
          password_hash: 'password123',
        },
        constraints: ['password_hash'],
      } as ValidationArguments;

      const result = validator.validate('differentPassword', args);

      expect(result).toBe(false);
    });

    it('should use the property specified in constraints', () => {
      const args = {
        object: {
          password: 'secret123',
          password_hash: 'secret123',
        },
        constraints: ['password'],
      } as ValidationArguments;

      const result = validator.validate('secret123', args);

      expect(result).toBe(true);
    });

    it('should return false when the specified property does not exist', () => {
      const args = {
        object: {},
        constraints: ['password_hash'],
      } as ValidationArguments;

      const result = validator.validate('password123', args);

      expect(result).toBe(false);
    });

    it('should return true when both values are undefined', () => {
      const args = {
        object: {
          password_hash: undefined,
        },
        constraints: ['password_hash'],
      } as ValidationArguments;

      const result = validator.validate(undefined as any, args);

      expect(result).toBe(true);
    });

    it('should return false when values are different types', () => {
      const args = {
        object: {
          password_hash: '123',
        },
        constraints: ['password_hash'],
      } as ValidationArguments;

      const result = validator.validate(123 as any, args);

      expect(result).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return the expected error message', () => {
      expect(validator.defaultMessage()).toBe(
        'El password y la confirmacion no coinciden',
      );
    });
  });
});