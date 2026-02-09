# Usamos una imagen ligera de Apache con PHP
FROM php:8.2-apache

# Habilitamos el módulo de reescritura de Apache para manejar el .htaccess
RUN a2enmod rewrite

# Copiamos los archivos de tu repositorio al directorio del servidor
COPY . /var/www/html/

# Ajustamos permisos básicos
RUN chown -R www-data:www-data /var/www/html/

# Exponemos el puerto 80
EXPOSE 80

# Instalar base de datos postgresql
RUN apt-get update && apt-get install -y libpq-dev
<<<<<<< HEAD
RUN docker-php-ext-install pdo pdo_pgsql pgsql
=======
RUN docker-php-ext-install pdo pdo_pgsql pgsql

>>>>>>> d3b1c9a4c9fcb5ad29caad64f41990256d826003
