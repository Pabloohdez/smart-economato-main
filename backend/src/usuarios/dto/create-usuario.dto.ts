import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  usuario!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^[+\d()\s-]{7,20}$/)
  telefono?: string;

  @IsOptional()
  @IsIn(['admin', 'usuario'])
  rol?: string;
}