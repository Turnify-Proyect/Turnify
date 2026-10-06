import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class PaginatedUsersResponseDto {
  @ApiProperty({
    type: [User],
    description: 'Usuarios de la página solicitada, sin el hash de contraseña',
  })
  users!: User[];

  @ApiProperty({
    example: 42,
    description: 'Cantidad total de usuarios que cumplen los filtros',
  })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  limit!: number;

  @ApiProperty({ example: 9 })
  totalPages!: number;
}
