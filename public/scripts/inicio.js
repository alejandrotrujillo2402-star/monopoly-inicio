$(document).ready(function () {
  $("#country").countrySelect({
    defaultCountry: "co",
    preferredCountries: ["us", "mx", "es", "co"],
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000/api/jugadores";

  // 👉 Constantes principales
  const nombreInput = document.getElementById("nombre");
  const countryInput = document.getElementById("country");
  const fichas = document.querySelectorAll(".fucha");
  const colores = document.querySelectorAll(".circulo");
  const btnAgregar = document.getElementById("agregar");
  const tablaJugadores = document.getElementById("tabla-jugadores");
  const btnIniciar = document.querySelector(".iniciar");

  let fichaSeleccionada = null;
  let colorSeleccionado = null;
  let jugadores = [];
  let jugadorEditando = null;

  // 👉 Mostrar error
  function mostrarError(elemento, mensaje) {
    let errorDiv = elemento.parentElement.querySelector(".error-msg");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.classList.add("text-danger", "error-msg", "mt-1");
      elemento.parentElement.appendChild(errorDiv);
    }
    errorDiv.textContent = mensaje;
  }

  // 👉 Limpiar error
  function limpiarError(elemento) {
    let errorDiv = elemento.parentElement.querySelector(".error-msg");
    if (errorDiv) errorDiv.remove();
  }

 async function safeFetch(url, options = {}) {
  console.log("📡 Fetching:", url, options);

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    console.log("✅ Respuesta recibida:", data);

    if (!res.ok) throw new Error(data.message || "Error en la petición");
    return data;
  } catch (err) {
    alert("⚠️ " + err.message);
    console.error("❌ Error en fetch:", err);
    return null;
  }
}

  // 👉 Render tabla
  function renderTabla() {
    tablaJugadores.innerHTML = "";
    jugadores.forEach(j => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${j.pais}</td>
        <td>${j.nombre}</td>
        <td>${j.ficha}</td>
        <td><button class="circulo ${j.color}" disabled></button></td>
        <td>
          <button class="btn btn-warning btn-sm btn-actualizar">Actualizar</button>
          <button class="btn btn-danger btn-sm btn-eliminar">Eliminar</button>
        </td>
      `;

      // 👉 Eliminar
      fila.querySelector(".btn-eliminar").addEventListener("click", async () => {
        if (confirm(`¿Eliminar a ${j.nombre}?`)) {
          await safeFetch(`${API}/${j.id}`, { method: "DELETE" });
          cargarJugadores();
        }
      });

      // 👉 Actualizar
      fila.querySelector(".btn-actualizar").addEventListener("click", () => {
        jugadorEditando = j;
        nombreInput.value = j.nombre;
        countryInput.value = j.pais;

        // Seleccionar ficha
        fichas.forEach(f => {
          f.classList.remove("active");
          if (f.textContent.trim() === j.ficha) {
            f.classList.add("active");
            fichaSeleccionada = j.ficha;
          }
        });

        // Seleccionar color
        colores.forEach(c => {
          c.classList.remove("active");
          if (c.classList.contains(j.color)) {
            c.classList.add("active");
            colorSeleccionado = j.color;
          }
        });

        btnAgregar.textContent = "Actualizar Jugador";
      });

      tablaJugadores.appendChild(fila);
    });
  }

  // 👉 Cargar jugadores desde backend
  async function cargarJugadores() {
    const data = await safeFetch(API);
    if (data) {
      jugadores = data;
      renderTabla();
    }
  }

  // 👉 Selección ficha
  fichas.forEach(btn => {
    btn.addEventListener("click", () => {
      fichas.forEach(f => f.classList.remove("active"));
      btn.classList.add("active");
      fichaSeleccionada = btn.textContent.trim();
      limpiarError(document.querySelector(".fucha"));
    });
  });

  // 👉 Selección color
  colores.forEach(btn => {
    btn.addEventListener("click", () => {
      colores.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      colorSeleccionado = btn.classList[1];
      limpiarError(document.querySelector(".circulo"));
    });
  });

  // 👉 Agregar o actualizar jugador
  btnAgregar.addEventListener("click", async () => {
    const nombre = nombreInput.value.trim();
    const pais = countryInput.value.trim();
    let valido = true;

    if (!nombre) { mostrarError(nombreInput,"⚠️ Ingresa un nombre"); valido=false; } else limpiarError(nombreInput);
    if (!pais) { mostrarError(countryInput,"⚠️ Selecciona un país"); valido=false; } else limpiarError(countryInput);
    if (!fichaSeleccionada) { mostrarError(document.querySelector(".fucha"),"⚠️ Debes elegir una ficha"); valido=false; } else limpiarError(document.querySelector(".fucha"));
    if (!colorSeleccionado) { mostrarError(document.querySelector(".circulo"),"⚠️ Debes elegir un color"); valido=false; } else limpiarError(document.querySelector(".circulo"));

    if (!valido) return;

    // Validar duplicados
    const otros = jugadorEditando ? jugadores.filter(j => j.id !== jugadorEditando.id) : jugadores;
    if (otros.some(j => j.nombre === nombre)) return alert("❌ Ese nombre ya fue usado");
    if (otros.some(j => j.ficha === fichaSeleccionada)) return alert("❌ Esa ficha ya fue elegida");
    if (otros.some(j => j.color === colorSeleccionado)) return alert("❌ Ese color ya fue elegido");
    if (!jugadorEditando && jugadores.length >= 4) return alert("⚠️ Máximo 4 jugadores.");

    const nuevoJugador = { nombre, pais, ficha: fichaSeleccionada, color: colorSeleccionado, dinero:1000 };

    if (jugadorEditando) {
      await safeFetch(`${API}/${jugadorEditando.id}`, {
        method:"PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(nuevoJugador)
      });
      jugadorEditando=null;
      btnAgregar.textContent="Agregar Jugador";
    } else {
      await safeFetch(API, {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(nuevoJugador)
      });
    }

    // Reset formulario
    nombreInput.value=""; countryInput.value=""; fichaSeleccionada=null; colorSeleccionado=null;
    fichas.forEach(f=>f.classList.remove("active")); colores.forEach(c=>c.classList.remove("active"));
    cargarJugadores();
  });

  // 👉 Iniciar juego
  btnIniciar.addEventListener("click", () => {
    const mensaje = document.getElementById("mensaje-juego");
    mensaje.innerHTML="";
    if (jugadores.length < 2) mensaje.innerHTML=`<div class="alert alert-danger">⚠️ Se necesitan mínimo 2 jugadores.</div>`;
    else if (jugadores.length > 4) mensaje.innerHTML=`<div class="alert alert-danger">⚠️ Máximo 4 jugadores.</div>`;
    else mensaje.innerHTML=`<div class="alert alert-success">🎉 Juego iniciado con ${jugadores.length} jugadores!</div>`;
    setTimeout(()=>mensaje.innerHTML="",3000);
  });

  // 👉 Inicialización
  cargarJugadores();
});
