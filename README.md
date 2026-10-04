# NaturaGlow
 
E-commerce de cosmética botánica construido sobre una **arquitectura de tres capas** desplegada en Microsoft Azure.
 
Proyecto del curso **1ASI0726 Sistemas Operativos** · Universidad Peruana de Ciencias Aplicadas
 
---
 
## Sobre el proyecto
 
NaturaGlow es una tienda de productos de belleza natural. El objetivo del trabajo no era solo que la tienda funcionara, sino **separar de verdad las tres capas** en máquinas distintas y demostrar que cada una cumple su rol.
 
La decisión de diseño más importante del proyecto es esta: **el control de acceso no vive en el código PHP, vive en los permisos de MySQL.** PHP únicamente decide con qué usuario de base de datos se conecta según el rol de quien inició sesión; quien autoriza o niega cada operación es el motor. Un empleado puede crear productos pero no eliminarlos, y la negativa la emite MySQL con un `ERROR 1142`, no un `if`.
 
---
 
## Arquitectura
 
```
CAPA DE PRESENTACIÓN       CAPA DE APLICACIÓN        CAPA DE DATOS
HTML + CSS + JavaScript    Ubuntu + Apache + PHP     Ubuntu + MySQL 8.0
(navegador del cliente)    (máquina virtual)         (máquina virtual)
                                                      puerto 3306
```
 
Recorrido de una petición autenticada:
 
```
panel.html
   │  fetch POST  +  Authorization: Bearer <token>
   ▼
producto_crear.php
   1. busca el token en la tabla sesiones → obtiene el rol
   2. según el rol, elige el usuario de MySQL
   3. consulta preparada (mysqli_prepare + bind_param)
   │
   ▼
MySQL
   ejecuta el INSERT … o lo niega con ERROR 1142
```
 
---
 
## Stack
 
| Capa | Tecnología |
|---|---|
| Presentación | HTML5, CSS3, JavaScript (sin frameworks) |
| Aplicación | Ubuntu Server 24.04, Apache 2.4, PHP 8.3, mysqli |
| Datos | MySQL 8.0 |
| Infraestructura | Azure (2 VMs, NSG, VNets separadas) |
 
Sin dependencias externas: ni npm, ni Composer, ni librerías de terceros.
 
---
 
## Control de acceso por roles
 
Se crearon **tres usuarios de MySQL** con permisos distintos, todos restringidos a la IP de la VM de aplicación:
 
| Usuario | `productos` | Usado por |
|---|---|---|
| `ng_publico` | `SELECT` | visitantes sin sesión |
| `ng_empleado` | `SELECT, INSERT, UPDATE` | rol empleado |
| `ng_admin` | `SELECT, INSERT, UPDATE, DELETE` | rol administrador |
 
La aplicación elige el usuario según la sesión:
 
```php
function perfil_de($sesion) {
    if ($sesion['rol'] == 'admin') {
        return 'admin';
    }
    return 'empleado';
}
```
 
Y el endpoint de borrado **no pregunta por el rol**. Deja que la base decida:
 
```php
$link = conectar(perfil_de($sesion));
$stmt = preparar($link, "DELETE FROM productos WHERE id_producto = ?");
// Si es empleado, MySQL responde:
// ERROR 1142: DELETE command denied to user 'ng_empleado'@'...' for table 'productos'
```
 
---
 
## Funcionalidades
 
**Tienda**
- Catálogo con filtros por categoría y ordenamiento por nombre o precio
- Ficha de producto con selector de cantidad y productos relacionados
- Carrito persistente con subtotales, envío y total
- Checkout simulado con tres métodos: tarjeta, Yape y Plin
- Validación del número de tarjeta con el **algoritmo de Luhn**
**Panel del personal**
- CRUD completo sobre el catálogo
- Indicadores de inventario (stock total, valor, productos agotados)
- Permisos diferenciados entre administrador y empleado
**Cuentas**
- Registro de clientes con el rol asignado por el servidor
- Autenticación por token con vencimiento, almacenado en base de datos
- Contraseñas con hash bcrypt (`password_hash` / `password_verify`)
---
 
## Estructura
 
```
naturaglow/
├── index.html            Acceso: iniciar sesión y crear cuenta
├── inicio.html           Portada
├── catalogo.html         Tienda con filtros
├── producto.html         Ficha de producto
├── carrito.html          Carrito
├── pago.html             Checkout simulado
├── panel.html            Panel del personal (CRUD)
├── css/
│   └── estilos.css       Hoja única, CSS plano
├── js/
│   ├── datos.js          Único punto de contacto con la API
│   ├── sesion.js         Login, registro y roles
│   └── tienda.js         Carrito y componentes comunes
└── img/                  Fotografías de producto
 
api/                      (se despliega en /var/www/html/api/)
├── comun.php             Cabeceras, conexión, sesión y respuestas
├── validar_producto.php  Validación del lado del servidor
├── productos.php         GET  · catálogo
├── categorias.php        GET  · categorías
├── registro.php          POST · alta de cliente
├── sesion_iniciar.php    POST · login
├── sesion_cerrar.php     POST · logout
├── sesion_actual.php     GET  · identidad de la sesión
├── producto_crear.php    POST · INSERT
├── producto_actualizar.php POST · UPDATE
└── producto_eliminar.php POST · DELETE
 
sql/
└── 01_capa_datos.sql     Esquema, usuarios y permisos
```
 
---
 
## Decisiones de seguridad
 
- **Contraseñas con hash bcrypt.** Nunca se almacena ni se transmite la contraseña en claro. La sal aleatoria hace que dos usuarios con la misma contraseña tengan hashes distintos.
- **Consultas preparadas** en todas las operaciones, para cerrar la vía de inyección SQL.
- **El rol se resuelve en el servidor.** El navegador guarda un token; la verdad vive en la tabla `sesiones`. Manipular el `localStorage` no cambia los permisos.
- **Credenciales fuera del docroot**, en `/etc/naturaglow/config.php` con permisos `640`.
- **Errores genéricos al cliente**, detalle al log del servidor. La aplicación no revela el nombre del servidor, la base ni el usuario.
- **Mínimo privilegio en MySQL.** Ninguna cuenta usa `%` como host; cada una declara desde dónde puede conectarse.
### Limitaciones conocidas
 
Documentadas de forma deliberada como parte del análisis:
 
- El tráfico viaja por **HTTP**. En producción el token de sesión requeriría HTTPS.
- Las sesiones vencidas se acumulan en la tabla; en producción se purgarían con una tarea programada.
- Las VMs están en redes virtuales sin emparejar, así que el tráfico entre capas sale por IP pública. Se verificó con `tcpdump`.
---
 
## Puesta en marcha
 
### 1. Capa de datos
 
```bash
mysql -u <usuario> -p < sql/01_capa_datos.sql
```
 
Crea las tablas `personal` y `sesiones`, añade columnas a `productos` y `clientes`, y crea los tres usuarios con sus permisos.
 
### 2. Capa de aplicación
 
```bash
# Configuración, fuera de la carpeta pública
sudo mkdir -p /etc/naturaglow
sudo nano /etc/naturaglow/config.php
sudo chown root:www-data /etc/naturaglow/config.php
sudo chmod 640 /etc/naturaglow/config.php
 
# Endpoints
sudo cp api/*.php /var/www/html/api/
sudo chown -R www-data:www-data /var/www/html/api
 
# Permitir la cabecera Authorization
echo 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1' \
  | sudo tee /etc/apache2/conf-available/naturaglow.conf
sudo a2enconf naturaglow
sudo systemctl reload apache2
```
 
Verificación:
 
```bash
curl -s http://localhost/api/categorias.php
```
 
### 3. Capa de presentación
 
En `js/datos.js`:
 
```javascript
BASE: "http://<ip-de-la-vm-de-aplicacion>",
BD_ACTIVA: true,
```
 
Y se sirve la carpeta con cualquier servidor estático:
 
```bash
python -m http.server 5500
```
 
> Con `BD_ACTIVA: false` la tienda funciona con datos de muestra, sin necesidad de las máquinas virtuales.
 
---
 
## Autores
 
Grupo 6 · 1ASI0726 Sistemas Operativos · UPC
 
| | |
|---|---|
| Capa de presentación, integración y seguridad | Jorge Mateo León Naupari, Joan Payano |
| Capas de aplicación y datos, infraestructura Azure | Miler Rodríguez, Gabriel alcantara |
 
---
 
## Licencia
 
Proyecto académico. El código es de libre consulta con fines educativos.