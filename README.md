# NaturaGlow

E-commerce de cosmética botánica con **arquitectura de tres capas** desplegada en Azure.

Proyecto del curso 1ASI0726 Sistemas Operativos · UPC

---

## Arquitectura

```
PRESENTACIÓN              APLICACIÓN                DATOS
HTML + CSS + JS     →     Ubuntu + Apache + PHP  →  Ubuntu + MySQL 8.0
(navegador)               (máquina virtual)         (máquina virtual)
```

La idea central del proyecto: **el control de acceso está en los permisos de MySQL, no en el código PHP.** La aplicación solo elige con qué usuario de base de datos conectarse según el rol; quien autoriza o niega cada operación es el motor.

---

## Credenciales de prueba

**Personal** (no se registran, ya existen en la base):

| Correo | Contraseña | Rol | Puede |
|---|---|---|---|
| `admin@naturaglow.pe` | `admin2026` | admin | crear, editar y **eliminar** |
| `empleado@naturaglow.pe` | `empleado2026` | empleado | crear y editar |

**Clientas** (o crea una cuenta nueva desde la web):

| Correo | Contraseña |
|---|---|
| `ana.torres@mail.com` | `pass123` |

**Tarjeta de prueba para el checkout:** `4111 1111 1111 1111`, vencimiento futuro, CVV de 3 dígitos.

> Si entras como **empleado** e intentas eliminar un producto, MySQL responde:
> `ERROR 1142: DELETE command denied to user 'ng_empleado'@'...' for table 'productos'`
> Esa es la demostración del control de acceso por roles.

---

## Usuarios de MySQL

| Usuario | Permisos sobre `productos` |
|---|---|
| `ng_publico` | `SELECT` |
| `ng_empleado` | `SELECT, INSERT, UPDATE` |
| `ng_admin` | `SELECT, INSERT, UPDATE, DELETE` |

Ninguno usa `%` como host: todos están restringidos a la IP de la VM de aplicación.

---

## Funcionalidades

- Catálogo con filtros por categoría y ordenamiento
- Carrito persistente con subtotales, envío y total
- Checkout simulado: tarjeta (validada con el algoritmo de Luhn), Yape y Plin
- Panel del personal con CRUD completo e indicadores de inventario
- Registro de clientas con rol asignado por el servidor
- Contraseñas con hash bcrypt y consultas preparadas contra inyección SQL

---

## Estructura

```
naturaglow/          capa de presentación (HTML, CSS, JS, imágenes)
api/                 endpoints PHP → /var/www/html/api/
sql/                 esquema, usuarios y permisos
```

---

## Cómo ejecutarlo

**1. Base de datos**

```bash
mysql -u <usuario> -p < sql/01_capa_datos.sql
```

**2. Servidor de aplicación**

```bash
sudo cp api/*.php /var/www/html/api/
sudo systemctl reload apache2
curl -s http://localhost/api/categorias.php
```

**3. Front-end**

En `js/datos.js` pon la IP de tu VM de aplicación y sirve la carpeta:

```bash
python -m http.server 5500
```

> Con `BD_ACTIVA: false` la tienda funciona con datos de muestra, sin las VMs.

---

## Stack

HTML5 · CSS3 · JavaScript · PHP 8.3 · Apache 2.4 · MySQL 8.0 · Ubuntu Server 24.04 · Azure

Sin frameworks ni dependencias externas.

---

## Limitaciones conocidas

- El tráfico va por HTTP; en producción el token de sesión requeriría HTTPS
- Las sesiones vencidas se acumulan en la tabla `sesiones`
- Las dos VMs están en VNets sin emparejar, así que el tráfico entre capas sale por IP pública

---

## Autores

Grupo 6 · Jorge Mateo León Naupari · Miler Rodríguez · Gabriel Alcántara · Joan Payano