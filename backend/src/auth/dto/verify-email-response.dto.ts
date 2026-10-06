import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailResponseDto {
  @ApiProperty({
    example: 'Email verificado correctamente',
  })
  message!: string;
}
