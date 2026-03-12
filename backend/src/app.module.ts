import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { LoginModule } from './login/login.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { BajasModule } from './bajas/bajas.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { InformesModule } from './informes/informes.module';

@Module({
  imports: [
    DatabaseModule,
    LoginModule,
    UsuariosModule,
    CategoriasModule,
    ProveedoresModule,
    ProductosModule,
    PedidosModule,
    BajasModule,
    MovimientosModule,
    AuditoriaModule,
    InformesModule,
  ],
})
export class AppModule {}
