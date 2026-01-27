const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'assets', 'data', 'db.json');
const outputPath = path.join(__dirname, 'database.sql');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let sql = `CREATE DATABASE IF NOT EXISTS smart_economato;
USE smart_economato;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Table structure for table \`usuarios\`
--

CREATE TABLE \`usuarios\` (
  \`id\` varchar(50) NOT NULL,
  \`username\` varchar(50) NOT NULL,
  \`password\` varchar(255) NOT NULL,
  \`role\` varchar(20) DEFAULT 'user',
  \`nombre\` varchar(100),
  \`apellidos\` varchar(100),
  \`email\` varchar(100),
  \`telefono\` varchar(20),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table \`proveedores\`
--

CREATE TABLE \`proveedores\` (
  \`id\` int(11) NOT NULL,
  \`nombre\` varchar(100) NOT NULL,
  \`contacto\` varchar(100),
  \`telefono\` varchar(20),
  \`email\` varchar(100),
  \`direccion\` text,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table \`categorias\`
--

CREATE TABLE \`categorias\` (
  \`id\` int(11) NOT NULL,
  \`nombre\` varchar(100) NOT NULL,
  \`descripcion\` text,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table \`productos\`
--

CREATE TABLE \`productos\` (
  \`id\` varchar(50) NOT NULL,
  \`nombre\` varchar(100) NOT NULL,
  \`precio\` decimal(10,2) NOT NULL,
  \`precioUnitario\` varchar(20),
  \`stock\` int(11) DEFAULT 0,
  \`stockMinimo\` int(11) DEFAULT 0,
  \`categoriaId\` int(11),
  \`proveedorId\` int(11),
  \`unidadMedida\` varchar(20),
  \`marca\` varchar(50),
  \`codigoBarras\` varchar(50),
  \`fechaCaducidad\` date,
  \`descripcion\` text,
  \`imagen\` varchar(255),
  \`activo\` tinyint(1) DEFAULT 1,
  PRIMARY KEY (\`id\`),
  FOREIGN KEY (\`categoriaId\`) REFERENCES \`categorias\` (\`id\`),
  FOREIGN KEY (\`proveedorId\`) REFERENCES \`proveedores\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

`;

    // Usuarios
    if (data.usuarios) {
        data.usuarios.forEach(u => {
            const username = u.username || u.usuario; // Handle both fields seen in json
            const role = u.role || u.rol || 'user';
            sql += `INSERT INTO \`usuarios\` (\`id\`, \`username\`, \`password\`, \`role\`, \`nombre\`, \`apellidos\`, \`email\`, \`telefono\`) VALUES ('${u.id}', '${escape(username)}', '${escape(u.password)}', '${escape(role)}', '${escape(u.nombre)}', '${escape(u.apellidos)}', '${escape(u.email)}', '${escape(u.telefono)}');\n`;
        });
    }

    // Proveedores
    if (data.proveedores) {
        data.proveedores.forEach(p => {
            sql += `INSERT INTO \`proveedores\` (\`id\`, \`nombre\`, \`contacto\`, \`telefono\`, \`email\`, \`direccion\`) VALUES (${p.id}, '${escape(p.nombre)}', '${escape(p.contacto)}', '${escape(p.telefono)}', '${escape(p.email)}', '${escape(p.direccion)}');\n`;
        });
    }

    // Categorias
    if (data.categorias) {
        data.categorias.forEach(c => {
            sql += `INSERT INTO \`categorias\` (\`id\`, \`nombre\`, \`descripcion\`) VALUES (${c.id}, '${escape(c.nombre)}', '${escape(c.descripcion)}');\n`;
        });
    }

    // Productos
    if (data.productos) {
        data.productos.forEach(p => {
             // Handle boolean
             const activo = p.activo ? 1 : 0;
             const catId = p.categoria ? p.categoria.id : p.categoriaId;
             const provId = p.proveedor ? p.proveedor.id : p.proveedorId;
             
             sql += `INSERT INTO \`productos\` (\`id\`, \`nombre\`, \`precio\`, \`precioUnitario\`, \`stock\`, \`stockMinimo\`, \`categoriaId\`, \`proveedorId\`, \`unidadMedida\`, \`marca\`, \`codigoBarras\`, \`fechaCaducidad\`, \`descripcion\`, \`imagen\`, \`activo\`) VALUES ('${p.id}', '${escape(p.nombre)}', ${p.precio}, '${escape(p.precioUnitario)}', ${p.stock}, ${p.stockMinimo}, ${catId}, ${provId}, '${escape(p.unidadMedida)}', '${escape(p.marca)}', '${escape(p.codigoBarras)}', '${p.fechaCaducidad}', '${escape(p.descripcion)}', '${escape(p.imagen)}', ${activo});\n`;
        });
    }
    
    sql += `COMMIT;`;

    fs.writeFileSync(outputPath, sql);
    console.log(`Database SQL generated at ${outputPath}`);

} catch (err) {
    console.error("Error generating SQL:", err);
}

function escape(str) {
    if (!str) return '';
    return str.toString().replace(/'/g, "\\'");
}
