export type Categoria = { id: number | string; nombre: string };

export type Proveedor = { id: number | string; nombre: string };

export type Producto = {
  id: number | string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo?: number | null;
  fechaCaducidad?: string | null;
  categoriaId?: number | string | null;
  proveedorId?: number | string | null;
  codigoBarras?: string;
  alergenos?: string[];
  descripcion?: string;
  imagen?: string;
  marca?: string;
  unidadMedida?: string;
  precioUnitario?: string;
  activo?: boolean;
  categoria?: Categoria | null;
  proveedor?: Proveedor | null;
};

export type PedidoItem = {
  id: number | string;
  producto_id: number | string;
  producto_nombre: string;
  cantidad: number;
  cantidad_recibida?: number;
  precio_unitario?: number;
};

export type Pedido = {
  id: number | string;
  proveedor_nombre: string;
  estado: string;
  total: number | string;
  items: PedidoItem[];
};

export type Movimiento = {
  fecha: string;
  tipo: string;
  producto_nombre?: string;
  cantidad: number;
  motivo?: string;
  usuario_nombre?: string;
};

export type BajaHistorialItem = {
  fechaBaja: string;
  tipoBaja: string;
  cantidad: number | string;
  motivo?: string;
  usuario_nombre?: string;
  producto_nombre?: string;
  producto_precio?: string | number;
};

export type PedidoHistorial = {
  id: number | string;
  proveedor_nombre: string;
  estado: string;
  total: number | string;
};

export type UsuarioActivo = {
  id?: number | string;
  nombre?: string;
  apellidos?: string;
  usuario?: string;
  username?: string;
  email?: string;
  telefono?: string;
  rol?: string;
  role?: string;
  alergias?: string[];
};
