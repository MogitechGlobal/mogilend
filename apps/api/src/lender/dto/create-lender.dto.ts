import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLenderDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEmail() @IsNotEmpty() email!: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @IsOptional() tax_pin?: string;
  @IsString() @IsOptional() registration_number?: string;
  @IsString() @IsOptional() location?: string;
}