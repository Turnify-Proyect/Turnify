import { ApiProperty } from '@nestjs/swagger';

export class AuthStatusDto {
  @ApiProperty({
    example: 'Auth',
  })
  status!: string;
}
