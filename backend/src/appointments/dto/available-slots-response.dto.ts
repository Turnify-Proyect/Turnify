import { ApiProperty } from '@nestjs/swagger';

export class AvailableSlotsResponseDto {
  @ApiProperty({
    example: '2026-10-10',
  })
  date!: string;

  @ApiProperty({
    type: [String],
    example: ['09:00', '09:30', '10:00', '11:30'],
  })
  slots!: string[];
}
