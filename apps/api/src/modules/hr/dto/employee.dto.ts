import { IsString, IsEmail, IsNumber, IsOptional, IsDateString, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { EmploymentType } from "@prisma/client";

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  employeeNumber: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty({ enum: EmploymentType, required: false })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsNumber()
  baseSalary: number;

  @ApiProperty({ required: false, default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;
}
