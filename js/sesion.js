/* ==========================================================================
   NaturaGlow — Sesion y roles
   Ya no hay cuentas escritas aqui: todas viven en MySQL (tablas personal
   y clientes). Este archivo solo guarda el nombre para pintarlo en el
   encabezado; el ROL de verdad lo decide el servidor en cada peticion.
   ========================================================================== */

const Sesion = {

  LLAVE: "ng_sesion",

  actual() {
    try { return JSON.parse(localStorage.getItem(this.LLAVE)); }
    catch (e) { return null; }
  },

  esPersonal() {
    const s = this.actual();
    return !!s && (s.rol === "admin" || s.rol === "empleado");
  },

  guardar(sesion) {
    localStorage.setItem(this.LLAVE, JSON.stringify(sesion));
  },

  /* ----- Entrar ----- */
  async entrar(correo, clave) {
    try {
      const r = await API.entrar(correo, clave);
      const s = { correo: r.correo, nombre: r.nombre, rol: r.rol };
      this.guardar(s);
      return { ok: true, sesion: s };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /* ----- Crear cuenta de clienta -----
     El rol NO se manda: lo pone el servidor ('cliente'). */
  async registrar({ nombre, apellido, correo, clave }) {
    try {
      await API.registrar({
        nombre:   nombre,
        apellido: apellido,
        correo:   correo,
        clave:    clave,
        telefono: ""
      });
      // recien creada, la hacemos entrar
      return await this.entrar(correo, clave);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /* ----- Salir ----- */
  async salir() {
    await API.salir();
    localStorage.removeItem(this.LLAVE);
  },

  /* Le pregunta al servidor si la sesion sigue viva. */
  async verificar() {
    const yo = await API.quienSoy();
    if (yo === null) {
      localStorage.removeItem(this.LLAVE);
      return null;
    }
    const s = this.actual() || {};
    s.nombre = yo.nombre;
    s.rol    = yo.rol;          // el servidor manda
    this.guardar(s);
    return s;
  },

  destino(rol) {
    return (rol === "admin" || rol === "empleado") ? "panel.html" : "inicio.html";
  }
};
