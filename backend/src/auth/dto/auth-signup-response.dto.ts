import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export class AuthSignUpResponseDto {
  @ApiProperty({
    example: 'Usuario registrado correctamente. Ya podés iniciar sesión.',
  })
  message!: string;

  @ApiProperty({
    type: User,
  })
  user!: User;
}
