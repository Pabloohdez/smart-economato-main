import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  categoria_id?: number;
}
