/* ==========================================================================
  NaturaGlow — Capa de datos
  Unico archivo que habla con la VM de aplicacion (Apache + PHP).
  Si BD_ACTIVA es false, usa los datos de muestra del final del archivo.
   ========================================================================== */

const API = {

  /* VM de aplicacion */
  BASE: "http://20.104.234.86",

  /* true  = todo sale de MySQL a traves de los .php
     false = datos de muestra guardados en el navegador (sin VM) */
  BD_ACTIVA: true,


  /* ---------- El token de la sesion ----------
     Lo entrega sesion_iniciar.php y viaja en cada peticion. */

  token() {
    return localStorage.getItem("ng_token");
  },

  guardarToken(t) {
    if (t === null) {
      localStorage.removeItem("ng_token");
    } else {
      localStorage.setItem("ng_token", t);
    }
  },

  cabeceras() {
    var h = { "Content-Type": "application/json" };
    var t = this.token();
    if (t !== null) {
      h["Authorization"] = "Bearer " + t;
    }
    return h;
  },


  /* ---------- La funcion que hace TODAS las peticiones ---------- */

  async pedir(ruta, metodo, datos) {
    var opciones = { method: metodo, headers: this.cabeceras() };
    if (datos !== undefined) {
      opciones.body = JSON.stringify(datos);
    }

    var r;
    try {
      r = await fetch(this.BASE + "/api/" + ruta, opciones);
    } catch (e) {
      // ni siquiera llego: VM apagada, Apache caido o puerto cerrado
      throw new Error("No se pudo contactar con el servidor");
    }

    var cuerpo = null;
    try { cuerpo = await r.json(); } catch (e) { cuerpo = null; }

    if (!r.ok) {
      var mensaje = "Error " + r.status;
      if (cuerpo !== null && cuerpo.error) {
        mensaje = cuerpo.error;
      }
      if (r.status === 401) {
        this.guardarToken(null);   // el token vencio
      }
      throw new Error(mensaje);
    }

    return cuerpo;
  },


  /* ---------- Lectura ---------- */

  async productos() {
    if (!this.BD_ACTIVA) return Almacen.leer();
    return this.pedir("productos.php", "GET");
  },

  async categorias() {
    if (!this.BD_ACTIVA) return MUESTRA.categorias;
    return this.pedir("categorias.php", "GET");
  },


  /* ---------- Escritura: el CRUD del panel ---------- */

  async crear(producto) {
    if (!this.BD_ACTIVA) return Almacen.crear(producto);
    return this.pedir("producto_crear.php", "POST", producto);
  },

  async actualizar(producto) {
    if (!this.BD_ACTIVA) return Almacen.actualizar(producto);
    return this.pedir("producto_actualizar.php", "POST", producto);
  },

  async eliminar(id) {
    if (!this.BD_ACTIVA) return Almacen.eliminar(id);
    return this.pedir("producto_eliminar.php", "POST", { id: id });
  },
  /* ---------- Cuentas y sesion ---------- */

  /* Cuentas del personal SOLO para el modo sin servidor (BD_ACTIVA false).
    Con la base conectada estas NO se usan: las de verdad viven en la
     tabla personal de MySQL.                                          */
  PERSONAL_LOCAL: [
    { correo: "admin@naturaglow.pe",    clave: "admin2026",    nombre: "Lucia Paredes", rol: "admin" },
    { correo: "empleado@naturaglow.pe", clave: "empleado2026", nombre: "Diego Rojas",   rol: "empleado" },
    { correo: "miler123@gmail.com",  clave: "123456",  nombre: "Miler Rodriguez",  rol: "cliente" }
  ],

  /* Las clientas creadas sin servidor se guardan en el navegador */
  clientesLocales() {
    var texto = localStorage.getItem("ng_clientes");
    if (texto === null) {
      return [];
    }
    return JSON.parse(texto);
  },


  async registrar(datos) {
    if (!this.BD_ACTIVA) {
      var lista = this.clientesLocales();

      for (var i = 0; i < lista.length; i++) {
        if (lista[i].correo === datos.correo) {
          throw new Error("Ya existe una cuenta con ese correo");
        }
      }

      lista.push({
        correo: datos.correo,
        clave:  datos.clave,
        nombre: (datos.nombre + " " + datos.apellido).trim(),
        rol:    "cliente"
      });
      localStorage.setItem("ng_clientes", JSON.stringify(lista));
      return { ok: true, rol: "cliente" };
    }

    return this.pedir("registro.php", "POST", datos);
  },


  async entrar(correo, clave) {
    if (!this.BD_ACTIVA) {
      correo = correo.trim().toLowerCase();

      // 1. el personal
      for (var i = 0; i < this.PERSONAL_LOCAL.length; i++) {
        var p = this.PERSONAL_LOCAL[i];
        if (p.correo === correo && p.clave === clave) {
          var s = { nombre: p.nombre, rol: p.rol, correo: p.correo };
          localStorage.setItem("ng_sesion_local", JSON.stringify(s));
          return s;
        }
      }

      // 2. las clientas guardadas en el navegador
      var lista = this.clientesLocales();
      for (var j = 0; j < lista.length; j++) {
        if (lista[j].correo === correo && lista[j].clave === clave) {
          var c = { nombre: lista[j].nombre, rol: "cliente", correo: correo };
          localStorage.setItem("ng_sesion_local", JSON.stringify(c));
          return c;
        }
      }

      throw new Error("Correo o contraseña incorrectos");
    }

    var r = await this.pedir("sesion_iniciar.php", "POST",
                            { correo: correo, clave: clave });
    this.guardarToken(r.token);
    return r;
  },


  async salir() {
    if (!this.BD_ACTIVA) {
      localStorage.removeItem("ng_sesion_local");
      return;
    }
    try { await this.pedir("sesion_cerrar.php", "POST", {}); }
    catch (e) { /* si el token ya vencio, da igual */ }
    this.guardarToken(null);
  },


  /* Le pregunta al servidor quien soy. null si el token vencio. */
  async quienSoy() {
    if (!this.BD_ACTIVA) {
      var texto = localStorage.getItem("ng_sesion_local");
      if (texto === null) {
        return null;
      }
      return JSON.parse(texto);
    }

    if (this.token() === null) return null;
    try { return await this.pedir("sesion_actual.php", "GET"); }
    catch (e) { return null; }
  }
};


/* ==========================================================================
  Almacen: hace de "base de datos" mientras no haya MySQL conectado.
  Guarda la lista de productos en el navegador para que lo que el
  administrador cambie en panel.html se vea de verdad en el catalogo.
   ========================================================================== */

const Almacen = {

  LLAVE: "ng_productos",

  leer() {
    var texto = localStorage.getItem(this.LLAVE);
    if (texto === null) {
      // primera vez: copiamos los productos de muestra
      var copia = JSON.parse(JSON.stringify(MUESTRA.productos));
      this.guardar(copia);
      return copia;
    }
    return JSON.parse(texto);
  },

  guardar(lista) {
    localStorage.setItem(this.LLAVE, JSON.stringify(lista));
  },

  /* El id que tocaria en la base: el mayor que haya, mas uno */
  siguienteId() {
    var lista = this.leer();
    var mayor = 0;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id > mayor) {
        mayor = lista[i].id;
      }
    }
    return mayor + 1;
  },

  crear(producto) {
    var lista = this.leer();
    producto.id = this.siguienteId();
    lista.push(producto);
    this.guardar(lista);
    return producto;
  },

  actualizar(producto) {
    var lista = this.leer();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === producto.id) {
        lista[i] = producto;
      }
    }
    this.guardar(lista);
    return producto;
  },

  eliminar(id) {
    var lista = this.leer();
    var nueva = [];
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id !== id) {
        nueva.push(lista[i]);
      }
    }
    this.guardar(nueva);
    return { ok: true };
  },

  /* Devuelve todo a los 10 productos originales */
  reiniciar() {
    localStorage.removeItem(this.LLAVE);
    return this.leer();
  }
};


/* ---------- Datos de muestra ----------
   Son los mismos productos que ya están cargados en naturaglow_db, para que
   al conectar la base no cambie nada en pantalla.                           */

const MUESTRA = {

  categorias: [
    { id: 1, nombre: "Cuidado facial" },
    { id: 2, nombre: "Cabello" },
    { id: 3, nombre: "Cuerpo" },
    { id: 4, nombre: "Maquillaje mineral" },
    { id: 5, nombre: "Aromaterapia" }
  ],

  productos: [
    { id: 1,  categoria: 1, nombre: "Crema facial de aloe vera",  descripcion: "Hidratación profunda",          precio: 45.90, stock: 30, organico: true,  envase: "tarro",   insignia: "Más vendido", imagen: "img/productos/crema-aloe.jpg" },
    { id: 2,  categoria: 1, nombre: "Sérum de vitamina C",        descripcion: "Antioxidante para piel radiante", precio: 68.50, stock: 20, organico: true,  envase: "gotero",  insignia: "Nuevo", imagen: "img/productos/serum-vitc.jpg" },
    { id: 3,  categoria: 2, nombre: "Shampoo de romero",          descripcion: "Fortalece el cabello",           precio: 38.00, stock: 40, organico: true,  envase: "botella", insignia: "", imagen: "img/productos/shampoo-romero.jpg" },
    { id: 4,  categoria: 2, nombre: "Acondicionador de coco",     descripcion: "Nutrición sin sulfatos",         precio: 36.00, stock: 35, organico: true,  envase: "botella", insignia: "", imagen: "img/productos/acond-coco.jpg" },
    { id: 5,  categoria: 3, nombre: "Jabón artesanal de avena",   descripcion: "Exfoliante suave",               precio: 18.50, stock: 60, organico: true,  envase: "pastilla",insignia: "", imagen: "img/productos/jabon-avena.jpg" },
    { id: 6,  categoria: 3, nombre: "Manteca corporal de karité", descripcion: "Hidratación intensa",            precio: 42.00, stock: 25, organico: true,  envase: "tarro",   insignia: "", imagen: "img/productos/karite.jpg" },
    { id: 7,  categoria: 4, nombre: "Labial mineral coral",       descripcion: "Pigmento natural",               precio: 32.00, stock: 50, organico: true,  envase: "tubo",    insignia: "", imagen: "img/productos/labial-coral.jpg" },
    { id: 8,  categoria: 4, nombre: "Base líquida mineral",       descripcion: "Cobertura ligera",               precio: 55.00, stock: 18, organico: true,  envase: "gotero",  insignia: "", imagen: "img/productos/base-mineral.jpg" },
    { id: 9,  categoria: 5, nombre: "Aceite esencial de lavanda", descripcion: "Relajante 100% puro",            precio: 28.00, stock: 45, organico: true,  envase: "gotero",  insignia: "Favorito", imagen: "img/productos/lavanda.jpg" },
    { id: 10, categoria: 5, nombre: "Difusor de aromas cerámico", descripcion: "Difusor ultrasónico",            precio: 89.90, stock: 12, organico: false, envase: "difusor", insignia: "", imagen: "img/productos/difusor.jpg" },
    { id: 11, categoria: 2, nombre: "Shampoo de coco",            descripcion: "Hidratación natural",            precio: 50.00, stock: 20, organico: true,  envase: "botella", insignia: "", imagen: "img/productos/shampoo-coco.jpg"}
  ]
};