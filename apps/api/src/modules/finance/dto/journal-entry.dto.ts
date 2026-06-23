import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class JournalLineDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ default: 0 })
  @IsNumber()
  debit: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  credit: number;
}

export class CreateJournalEntryDto {
  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false, default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
