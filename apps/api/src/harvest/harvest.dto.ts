import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HoldLineDto {
  @ApiProperty()
  @IsString()
  cropId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.5)
  @Max(10)
  kg!: number;
}

export class HoldDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(6)
  partySize!: number;

  @ApiProperty({ type: [HoldLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HoldLineDto)
  lines!: HoldLineDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];
}

export class ConfirmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentRef?: string;
}

export class CheckInDto {
  @ApiProperty()
  @IsString()
  code!: string;
}

export class WeighLineDto {
  @ApiProperty()
  @IsString()
  cropId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  actualKg!: number;
}

export class WeighDto {
  @ApiProperty({ type: [WeighLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeighLineDto)
  lines!: WeighLineDto[];
}

export class PatchDayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxVisitors?: number;
}

export class ReviewDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cropId?: string;
}
