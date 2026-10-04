/* ===========================================================
   NaturaGlow - Funciones de la tienda
   JavaScript basico: funciones sueltas, sin librerias.
   Se usa en: inicio.html, catalogo.html, producto.html, carrito.html
   =========================================================== */


/* ---------- 1. Carrito ----------
   Se guarda en el navegador con localStorage para que no se
   pierda al cambiar de pagina o recargar.                     */

function leerCarrito() {
  var texto = localStorage.getItem("ng_carrito");
  if (texto === null) {
    return [];
  }
  return JSON.parse(texto);
}

function guardarCarrito(lista) {
  localStorage.setItem("ng_carrito", JSON.stringify(lista));
  pintarContador();
}

function agregarAlCarrito(producto, cuantos) {
  if (!cuantos) {
    cuantos = 1;
  }
  var lista = leerCarrito();
  var encontrado = false;

  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === producto.id) {
      lista[i].cantidad = lista[i].cantidad + cuantos;
      encontrado = true;
    }
  }

  if (encontrado === false) {
    lista.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      cantidad: cuantos
    });
  }

  guardarCarrito(lista);
}

function quitarDelCarrito(id) {
  var lista = leerCarrito();
  var nueva = [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id !== id) {
      nueva.push(lista[i]);
    }
  }
  guardarCarrito(nueva);
}

function cambiarCantidad(id, nuevaCantidad) {
  if (nuevaCantidad < 1) {
    quitarDelCarrito(id);
    return;
  }
  var lista = leerCarrito();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) {
      lista[i].cantidad = nuevaCantidad;
    }
  }
  guardarCarrito(lista);
}

function totalUnidades() {
  var lista = leerCarrito();
  var suma = 0;
  for (var i = 0; i < lista.length; i++) {
    suma = suma + lista[i].cantidad;
  }
  return suma;
}

function totalSoles() {
  var lista = leerCarrito();
  var suma = 0;
  for (var i = 0; i < lista.length; i++) {
    suma = suma + (lista[i].precio * lista[i].cantidad);
  }
  return suma;
}

function pintarContador(conRebote) {
  var caja = document.getElementById("contador");
  if (caja === null) {
    return;
  }
  caja.innerHTML = totalUnidades();

  // Pequeno rebote al anadir un producto
  if (conRebote === true) {
    caja.className = "contador contador-salta";
    setTimeout(function () {
      caja.className = "contador";
    }, 300);
  }
}


/* ---------- 1b. La barra de arriba al desplazarse ----------
   Cuando la pagina baja mas de 40 px le ponemos la clase
   "cabecera-fija". El CSS se encarga de la transicion suave. */

function vigilarCabecera() {
  var barra = document.getElementById("cabecera");
  if (barra === null) {
    return;
  }

  function revisar() {
    if (window.pageYOffset > 40) {
      barra.className = "cabecera cabecera-fija";
    } else {
      barra.className = "cabecera";
    }
  }

  window.onscroll = revisar;
  revisar();   // por si la pagina abre ya desplazada
}


/* ---------- 1c. Cambio suave de pagina ----------
   Al tocar un enlace del sitio, la pagina se desvanece y recien
   despues cambia. Son 280 ms: lo justo para que no sea un salto
   seco pero tampoco se sienta lento.                             */

function salidaSuave() {
  var enlaces = document.getElementsByTagName("a");

  for (var i = 0; i < enlaces.length; i++) {
    var a = enlaces[i];
    var destino = a.getAttribute("href");

    // nos saltamos los anclas (#), los externos y el de la cuenta
    if (destino === null) continue;
    if (destino.charAt(0) === "#") continue;
    if (destino.indexOf("http") === 0) continue;
    if (a.id === "cuenta") continue;

    a.onclick = function (evento) {
      evento.preventDefault();
      var adonde = this.getAttribute("href");
      document.body.className = "saliendo";
      setTimeout(function () {
        window.location.href = adonde;
      }, 280);
    };
  }
}


/* ---------- 2. Aviso emergente ---------- */

function avisar(texto) {
  var caja = document.getElementById("brindis");
  if (caja === null) {
    return;
  }
  caja.innerHTML = texto;
  caja.className = "brindis brindis-visible";
  setTimeout(function () {
    caja.className = "brindis";
  }, 2500);
}


/* ---------- 3. Sesion en el encabezado ---------- */

function pintarSesion() {
  var enlace = document.getElementById("cuenta");
  if (enlace === null) {
    return;
  }
  var s = Sesion.actual();
  if (s === null) {
    enlace.innerHTML = "Entrar";
    enlace.href = "index.html";
    return;
  }
  enlace.innerHTML = s.nombre.split(" ")[0];
  enlace.href = "#";
  enlace.onclick = async function (evento) {
    evento.preventDefault();
    if (confirm("¿Cerrar sesión?")) {
      await Sesion.salir();            // avisa al servidor y borra el token
      window.location.href = "index.html";
    }
  };
}


/* ---------- 4. Buscar un producto por su id ---------- */

function buscarProducto(lista, id) {
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) {
      return lista[i];
    }
  }
  return null;
}

function nombreCategoria(categorias, id) {
  for (var i = 0; i < categorias.length; i++) {
    if (categorias[i].id === id) {
      return categorias[i].nombre;
    }
  }
  return "";
}

/* Lee un valor de la direccion, por ejemplo producto.html?id=3 */
function valorDeLaUrl(nombre) {
  var partes = window.location.search.replace("?", "").split("&");
  for (var i = 0; i < partes.length; i++) {
    var par = partes[i].split("=");
    if (par[0] === nombre) {
      return par[1];
    }
  }
  return null;
}


/* ---------- 5. Dibujar una tarjeta de producto ---------- */

/* Devuelve la etiqueta <img> de un producto.
   Si el archivo no existe, onerror pone la imagen generica
   y asi la pagina nunca se ve rota.                          */
function htmlImagen(p, alto) {
  var ruta = p.imagen;
  if (!ruta) {
    ruta = "img/productos/generico.jpg";
  }
  var h = "";
  h += '<img src="' + ruta + '"';
  h +=   ' alt="' + p.nombre + '"';
  h +=   ' class="foto"';
  h +=   ' onerror="this.src=\'img/productos/generico.jpg\'">';
  return h;
}


function htmlTarjeta(p, categorias) {
  var html = "";
  html += '<div class="producto">';
  html +=   '<a href="producto.html?id=' + p.id + '">';
  html +=     '<div class="producto-imagen">';
  if (p.insignia !== "") {
    html +=     '<span class="insignia">' + p.insignia + '</span>';
  }
  html +=       htmlImagen(p);
  html +=     '</div>';
  html +=   '</a>';
  html +=   '<div class="producto-datos">';
  html +=     '<span class="producto-categoria">' + nombreCategoria(categorias, p.categoria) + '</span>';
  html +=     '<h3><a href="producto.html?id=' + p.id + '">' + p.nombre + '</a></h3>';
  html +=     '<span class="producto-precio">S/ ' + p.precio.toFixed(2) + '</span>';
  html +=     '<button class="producto-boton" onclick="clicAgregar(' + p.id + ')">Añadir al carrito</button>';
  html +=   '</div>';
  html += '</div>';
  return html;
}

/* Guardamos los productos aqui para que el boton los encuentre */
var PRODUCTOS = [];
var CATEGORIAS = [];

function clicAgregar(id) {
  var p = buscarProducto(PRODUCTOS, id);
  if (p === null) {
    return;
  }
  agregarAlCarrito(p, 1);
  pintarContador(true);
  avisar(p.nombre + " añadido al carrito");
}
