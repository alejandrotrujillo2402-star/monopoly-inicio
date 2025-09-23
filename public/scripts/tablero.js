// public/scripts/tablero.js
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000/api/jugadores";

  // construir 11x11 casillas
  const tablero = document.getElementById("tablero");
  if (tablero) {
    let html = "";
    for (let fila = 0; fila < 11; fila++) {
      for (let columna = 0; columna < 11; columna++) {
        const indice = fila * 11 + columna;
        html += `<div id="casilla-${indice}" class="casilla" data-fila="${fila}" data-columna="${columna}"></div>`;
      }
    }
    tablero.innerHTML = html;
  }

  // Elementos UI
  const btnTirar = document.getElementById("btn-tirar");
  const mostrarDados = document.getElementById("mostrar-dados");
  const listaJugadoresUL = document.getElementById("lista-jugadores-ul");
  const jugadorActualDiv = document.getElementById("jugador-actual");
  const registroDiv = document.getElementById("registro");

  // Estado
  let jugadores = [];
  let orden = [];
  let indiceTurno = 0;
  let posiciones = {};
  const TOTAL_CASILLAS = 40;

  // funciones auxiliares
  async function peticionSegura(url, opciones = {}) {
    try {
      const respuesta = await fetch(url, opciones);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || "Error en petición");
      return datos;
    } catch (error) {
      console.error("Error en peticionSegura:", error);
      agregarRegistro("⚠️ " + error.message);
      return null;
    }
  }

  function agregarRegistro(texto) {
    if (!registroDiv) return;
    const elemento = document.createElement("div");
    elemento.textContent = `[${new Date().toLocaleTimeString()}] ${texto}`;
    registroDiv.prepend(elemento);
  }

  async function cargarJugadores() {
    const datos = await peticionSegura(API);
    if (!datos) return;
    jugadores = datos;
    jugadores.sort((a, b) => a.id - b.id);
    orden = jugadores.map(jugador => jugador.id);
    jugadores.forEach(jugador => {
      if (posiciones[jugador.id] === undefined) posiciones[jugador.id] = 0;
    });
    renderizarJugadores();
    renderizarFichasTablero();
    actualizarUIJugadorActual();
  }

  function renderizarJugadores() {
    if (!listaJugadoresUL) return;
    listaJugadoresUL.innerHTML = "";
    jugadores.forEach(jugador => {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between";
      li.innerHTML = `
        <div class="flex items-center gap-3">
          <div style="width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#eee">${jugador.ficha}</div>
          <div class="text-sm">
            <div class="font-medium">${jugador.nombre}</div>
            <div class="text-xs text-slate-500">\$${jugador.dinero ?? 0}</div>
          </div>
        </div>
        <div class="text-xs text-slate-500">pos: ${posiciones[jugador.id] ?? 0}</div>
      `;
      listaJugadoresUL.appendChild(li);
    });
  }

  function renderizarFichasTablero() {
    jugadores.forEach((jugador, indice) => {
      const anterior = document.querySelector(`.ficha[data-jugador='${jugador.id}']`);
      if (anterior) anterior.remove();

      const posicion = posiciones[jugador.id] ?? 0;
      const idCasilla = mapearPosicionACasillaId(posicion);
      const casilla = document.getElementById(idCasilla);
      if (!casilla) return;

      const ficha = document.createElement("div");
      ficha.className = "ficha";
      ficha.dataset.jugador = jugador.id;
      ficha.style.background = colorDeClase(jugador.color || "");
      ficha.textContent = jugador.ficha ?? "●";

      const desplazamiento = 10 * (indice % 4);
      ficha.style.transform = `translate(${desplazamiento}px, ${desplazamiento}px)`;

      const nombre = document.createElement("div");
      nombre.className = "nombre-ficha";
      nombre.textContent = jugador.nombre;

      casilla.appendChild(ficha);
      casilla.appendChild(nombre);
    });
  }

  function mapearPosicionACasillaId(posicion) {
    const perimetro = [];
    for (let columna = 10; columna >= 0; columna--) perimetro.push(10 * 11 + columna);
    for (let fila = 9; fila >= 1; fila--) perimetro.push(fila * 11 + 0);
    for (let columna = 1; columna <= 10; columna++) perimetro.push(0 * 11 + columna);
    for (let fila = 1; fila <= 9; fila++) perimetro.push(fila * 11 + 10);
    const indice = posicion % perimetro.length;
    const indiceCasilla = perimetro[indice];
    return `casilla-${indiceCasilla}`;
  }

  function colorDeClase(clase) {
    if (!clase) return "#efefef";
    if (clase.includes("blue") || clase.includes("azul")) return "#2563eb";
    if (clase.includes("red") || clase.includes("rojo")) return "#ef4444";
    if (clase.includes("green") || clase.includes("verde")) return "#10b981";
    if (clase.includes("yellow") || clase.includes("amarillo")) return "#f59e0b";
    if (clase.includes("black") || clase.includes("negro")) return "#111827";
    return "#7c3aed";
  }

  function actualizarUIJugadorActual() {
    if (!jugadorActualDiv) return;
    if (orden.length === 0) {
      jugadorActualDiv.textContent = "Jugador: —";
      return;
    }
    const idActual = orden[indiceTurno % orden.length];
    const jugador = jugadores.find(j => j.id === idActual) || {};
    jugadorActualDiv.textContent = `Jugador: ${jugador.nombre ?? "—"}`;
  }

  async function manejarTirarDados() {
    if (orden.length === 0) { agregarRegistro("No hay jugadores."); return; }
    const idActual = orden[indiceTurno % orden.length];
    const jugador = jugadores.find(j => j.id === idActual);
    if (!jugador) return;

    const dado1 = 1 + Math.floor(Math.random() * 6);
    const dado2 = 1 + Math.floor(Math.random() * 6);
    const total = dado1 + dado2;
    if (mostrarDados) mostrarDados.textContent = `${dado1} + ${dado2} = ${total}`;

    agregarRegistro(`${jugador.nombre} tiró ${dado1} y ${dado2} (avanza ${total})`);

    posiciones[idActual] = ((posiciones[idActual] ?? 0) + total) % TOTAL_CASILLAS;

    renderizarFichasTablero();
    renderizarJugadores();

    if (dado1 !== dado2) {
      indiceTurno = (indiceTurno + 1) % orden.length;
      actualizarUIJugadorActual();
    } else {
      agregarRegistro(`${jugador.nombre} sacó doble y juega otra vez!`);
    }
  }

  function terminarTurno() {
    if (orden.length === 0) return;
    indiceTurno = (indiceTurno + 1) % orden.length;
    actualizarUIJugadorActual();
  }

  // Eventos UI
  if (btnTirar) btnTirar.addEventListener("click", manejarTirarDados);
  const btnTerminar = document.getElementById("btn-terminar-turno");
  if (btnTerminar) btnTerminar.addEventListener("click", terminarTurno);

  // Inicial
  cargarJugadores();

  // Para debug desde consola
  window._monopoly = {
    jugadores, posiciones, orden,
    establecerPos: (id, posicion) => { 
      posiciones[id] = posicion; 
      renderizarFichasTablero(); 
      renderizarJugadores(); 
    }
  };
});