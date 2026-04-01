import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PedidoItemDto {
  @IsString()
  producto_id: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}

export class CreatePedidoDto {
  @Type(() => Number)
  @IsNumber()
  proveedorId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoItemDto)
  items?: PedidoItemDto[];
}

export class RecepcionItemDto {
  @Type(() => Number)
  @IsNumber()
  detalle_id: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidad_recibida: number;
}

export class UpdatePedidoDto {
  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecepcionItemDto)
  items?: RecepcionItemDto[];
}
