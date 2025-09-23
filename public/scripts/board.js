// public/js/board.js
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000/api/jugadores"; // ya tienes este endpoint en tu server.js

  // UI elements (desktop + móvil tienen controles con ids parecidos)
  const btnRoll = document.getElementById("btn-roll") || document.getElementById("roll");
  const diceDisplay = document.getElementById("dice-display") || document.getElementById("dice");
  const playersUL = document.getElementById("players-ul") || document.getElementById("mobile-players");
  const currentPlayerDiv = document.getElementById("current-player");
  const logDiv = document.getElementById("log") || null;

  // Estado del cliente
  let jugadores = [];            // cargado desde API
  let order = [];                // orden de turno (ids)
  let turnIndex = 0;             // índice del jugador actual en 'order'
  let positions = {};            // { playerId: positionIndex } posición 0 = SALIDA
  const TOTAL_TILES = 40;        // número clásico de casillas (adaptable)

  // helper: safeFetch (mismo estilo que script.js)
  async function safeFetch(url, opts = {}) {
    console.log("fetch ->", url, opts);
    try {
      const res = await fetch(url, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error en petición");
      return data;
    } catch (err) {
      console.error("safeFetch error:", err);
      if (logDiv) appendLog("⚠️ " + err.message);
      return null;
    }
  }

  function appendLog(txt) {
    if (!logDiv) return;
    const el = document.createElement("div");
    el.textContent = `[${new Date().toLocaleTimeString()}] ${txt}`;
    logDiv.prepend(el);
  }

  // cargar jugadores desde backend y preparar estado
  async function cargarJugadores() {
    const data = await safeFetch(API);
    if (!data) return;
    jugadores = data;
    // ordenar por id para reproducibilidad; puedes cambiar a orden que venga de server
    jugadores.sort((a,b)=> a.id - b.id);
    order = jugadores.map(p => p.id);
    // si no hay posiciones guardadas, inicializa en SALIDA
    jugadores.forEach(p => {
      if (positions[p.id] === undefined) positions[p.id] = 0;
    });
    renderPlayers();
    renderBoardTokens();
    updateCurrentPlayerUI();
  }

  function renderPlayers() {
    if (!playersUL) return;
    playersUL.innerHTML = "";
    jugadores.forEach(p => {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between";
      li.innerHTML = `
        <div class="flex items-center gap-3">
          <div style="width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#eee">${p.ficha}</div>
          <div class="text-sm">
            <div class="font-medium">${p.nombre}</div>
            <div class="text-xs text-slate-500">\$${p.dinero ?? 0}</div>
          </div>
        </div>
        <div class="text-xs text-slate-500">pos: ${positions[p.id] ?? 0}</div>
      `;
      playersUL.appendChild(li);
    });
  }

  // RENDER tokens en el tablero (desktop): ubica tokens en casillas perimetrales.
  function renderBoardTokens() {
    // intención: mapear posición 0..39 a una casilla visible en el DOM.
    // Implementación flexible: buscaremos elementos con id cell-... que correspondan a perímetro.
    // Mapeo sencillo: convertimos 0..10 top, 11..20 right, 21..30 bottom, 31..39 left (como ejemplo)
    jugadores.forEach((p, idx) => {
      // remover token antiguo
      const prev = document.querySelector(`.token[data-player='${p.id}']`);
      if (prev) prev.remove();

      // calcular la casilla DOM target
      const pos = positions[p.id] ?? 0;
      const cellId = mapPosToCellId(pos);
      const cell = document.getElementById(cellId);
      if (!cell) return; // si no existe la celda, saltar

      // crear token
      const token = document.createElement("div");
      token.className = "token";
      token.dataset.player = p.id;
      token.style.background = colorFromClass(p.color || "");
      token.textContent = p.ficha ?? "●";

      // posicionar token dentro de la casilla (si hay varios, los desplazamos)
      // calculamos offset en base al índice del jugador
      const offset = 10 * (idx % 4);
      token.style.transform = `translate(${offset}px, ${offset}px)`;
      // tooltip nombre
      const name = document.createElement("div");
      name.className = "token-name";
      name.textContent = p.nombre;
      cell.appendChild(token);
      cell.appendChild(name);
    });
  }

  // Mapeo ejemplo entre pos(0..39) y id's de celda generadas en board.html (cell-<index>)
  function mapPosToCellId(pos) {
    // Tratamiento conservador: intentamos mapear perímetro de 11x11 (0..120 indices)
    // Mapeo simple:
    // pos 0 -> esquina inferior derecha (por ejemplo cell-120)
    // pos 1..10 -> bottom row leftwards
    // pos 11..20 -> left column upwards
    // pos 21..30 -> top row rightwards
    // pos 31..39 -> right column downwards
    // Este mapeo depende del DOM que creamos en board.html; ajústalo si reestructuras.
    const perim = [];
    // build indices along the 11x11 border (clockwise from bottom-right)
    // bottom row (right to left)
    for (let c = 10; c >= 0; c--) perim.push(10*11 + c); // row 10
    // left column (bottom-1 up to top+1)
    for (let r = 9; r >= 1; r--) perim.push(r*11 + 0);
    // top row (left to right)
    for (let c = 1; c <= 10; c++) perim.push(0*11 + c);
    // right column (top+1 down to bottom-1)
    for (let r = 1; r <= 9; r++) perim.push(r*11 + 10);

    // perim length should be 40
    const idx = pos % perim.length;
    const cellIndex = perim[idx];
    return `cell-${cellIndex}`;
  }

  function colorFromClass(cls) {
    // si tu color es 'botonblue' o similares, aquí puedes mapear a hex
    if (!cls) return "#efefef";
    if (cls.includes("blue")) return "#2563eb";
    if (cls.includes("red") || cls.includes("rojo")) return "#ef4444";
    if (cls.includes("green")) return "#10b981";
    if (cls.includes("yellow")) return "#f59e0b";
    if (cls.includes("black")) return "#111827";
    return "#7c3aed";
  }

  // TURN LOGIC
  function updateCurrentPlayerUI() {
    if (!currentPlayerDiv) return;
    if (order.length === 0) { currentPlayerDiv.textContent = "Jugador: —"; return; }
    const curId = order[turnIndex % order.length];
    const p = jugadores.find(x => x.id === curId) || {};
    currentPlayerDiv.textContent = `Jugador: ${p.nombre ?? "—"}`;
  }

  async function handleRollDice() {
    if (order.length === 0) { appendLog("No hay jugadores."); return; }
    const curId = order[turnIndex % order.length];
    const player = jugadores.find(x => x.id === curId);
    if (!player) return;

    // Tirada: dos dados 1..6
    const d1 = 1 + Math.floor(Math.random()*6);
    const d2 = 1 + Math.floor(Math.random()*6);
    const total = d1 + d2;
    if (diceDisplay) diceDisplay.textContent = `${d1} + ${d2} = ${total}`;

    appendLog(`${player.nombre} tiró ${d1} y ${d2} (avanza ${total})`);

    // mover posición
    positions[curId] = ((positions[curId] ?? 0) + total) % TOTAL_TILES;

    // animar token (re-render)
    renderBoardTokens();
    renderPlayers();

    // Si quieres notificar al backend sobre movimiento, aquí un ejemplo (opcional)
    //  await safeFetch("http://localhost:3000/api/move", {
    //    method: "POST",
    //    headers: {"Content-Type":"application/json"},
    //    body: JSON.stringify({ playerId: curId, steps: total, newPos: positions[curId] })
    //  });

    // si no sacó doble, avanza turno
    if (d1 !== d2) {
      turnIndex = (turnIndex + 1) % order.length;
      updateCurrentPlayerUI();
    } else {
      appendLog(`${player.nombre} sacó doble y juega otra vez!`);
    }
  }

  // terminar turno (forzar next)
  function endTurn() {
    if (order.length === 0) return;
    turnIndex = (turnIndex + 1) % order.length;
    updateCurrentPlayerUI();
  }

  // Eventos UI
  if (btnRoll) btnRoll.addEventListener("click", handleRollDice);
  const btnEnd = document.getElementById("btn-endturn") || document.getElementById("btn-endturn") || document.getElementById("endturn");
  if (btnEnd) btnEnd.addEventListener("click", endTurn);

  // Inicial
  cargarJugadores();

  // Si quieres, expón funciones para debug en consola:
  window._monopoly = {
    jugadores, positions, order, setPos: (id,p)=>{ positions[id]=p; renderBoardTokens(); renderPlayers(); }
  };
});
