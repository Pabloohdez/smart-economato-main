import { IsString, IsNumber, IsOptional, Min, IsArray } from 'class-validator';

export class CreateRendimientoDto {
  @IsNumber()
  @Min(0)
  valor: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @IsOptional()
  @IsString()
  fecha?: string;
}

export class CreateRendimientosArrayDto {
  @IsArray()
  items: CreateRendimientoDto[];
}
