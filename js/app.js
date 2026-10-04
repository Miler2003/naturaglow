/* ==========================================================================
   NaturaGlow — Portada
   Carrito en memoria del navegador, render del catálogo y animaciones.
   ========================================================================== */

const Carrito = {
  LLAVE: "ng_carrito",

  leer() {
    try { return JSON.parse(localStorage.getItem(this.LLAVE)) || []; }
    catch { return []; }
  },

  guardar(items) {
    localStorage.setItem(this.LLAVE, JSON.stringify(items));
    this.pintarContador();
  },

  agregar(producto) {
    const items = this.leer();
    const linea = items.find(i => i.id === producto.id);
    if (linea) linea.cantidad += 1;
    else items.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
    this.guardar(items);
    return items.reduce((n, i) => n + i.cantidad, 0);
  },

  total() {
    return this.leer().reduce((n, i) => n + i.cantidad, 0);
  },

  pintarContador() {
    const el = document.getElementById("carrito-num");
    if (el) el.textContent = this.total();
  }
};


/* ---------- Aviso emergente ---------- */
let relojBrindis;
function brindis(texto) {
  const el = document.getElementById("brindis");
  if (!el) return;
  el.querySelector("span").textContent = texto;
  el.classList.add("visible");
  clearTimeout(relojBrindis);
  relojBrindis = setTimeout(() => el.classList.remove("visible"), 2600);
}


/* ---------- Catálogo ---------- */
function tarjetaProducto(p, categorias) {
  const cat = categorias.find(c => c.id === p.categoria);
  const art = document.createElement("article");
  art.className = "producto revelar";
  art.innerHTML = `
    <div class="lienzo">
      ${p.insignia ? `<span class="insignia">${p.insignia}</span>` : ""}
      ${dibujarEnvase(p.envase, p.id)}
      <button class="anadir" type="button">Añadir al carrito</button>
    </div>
    <div class="datos">
      <span class="cat">${cat ? cat.nombre : ""}</span>
      <h3>${p.nombre}</h3>
      <span class="precio">S/ ${p.precio.toFixed(2)}</span>
    </div>`;
  art.querySelector(".anadir").addEventListener("click", () => {
    Carrito.agregar(p);
    brindis(`${p.nombre} · añadido`);
  });
  return art;
}

async function pintarCatalogo() {
  const caja = document.getElementById("rejilla");
  if (!caja) return;
  try {
    const [productos, categorias] = await Promise.all([API.productos(), API.categorias()]);
    caja.innerHTML = "";
    productos.slice(0, 8).forEach(p => caja.appendChild(tarjetaProducto(p, categorias)));
    observarRevelados();
  } catch (e) {
    caja.innerHTML = `<p style="grid-column:1/-1">No se pudo cargar el catálogo. ${e.message}</p>`;
  }
}


/* ---------- Aparición al desplazar ---------- */
let observador;
function observarRevelados() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".revelar").forEach(el => el.classList.add("dentro"));
    return;
  }
  observador = observador || new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("dentro");
        observador.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".revelar:not(.dentro)").forEach(el => observador.observe(el));
}


/* ---------- Sesión en el encabezado ---------- */
function pintarSesion() {
  const el = document.getElementById("cuenta");
  if (!el) return;
  const s = Sesion.actual();
  if (!s) { el.textContent = "Entrar"; el.href = "index.html"; return; }
  el.textContent = s.nombre.split(" ")[0];
  el.href = "#";
  el.addEventListener("click", ev => {
    ev.preventDefault();
    if (confirm("¿Cerrar sesión?")) { Sesion.salir(); location.href = "index.html"; }
  });
}


/* ---------- Arranque ---------- */
document.addEventListener("DOMContentLoaded", () => {
  Carrito.pintarContador();
  pintarSesion();
  pintarCatalogo();
  observarRevelados();

  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
});
