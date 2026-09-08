import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({
  name: 'MatchPassword',
  async: false,
})
export class MatchPassword implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const key = args.constraints[0] as string;
    const password = obj[key];

    if (password !== confirmPassword) {
      return false;
    }
    return true;
  }
  defaultMessage(): string {
    return 'El password y la confirmacion no coinciden';
  }
}
