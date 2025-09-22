const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ruta segura al JSON (relativa al server.js)

const jugadoresPath = path.join(__dirname, "json/jugadores.json");

// Crear JSON si no existe
if (!fs.existsSync(jugadoresPath)) {
  fs.mkdirSync(path.join(__dirname, "json"), { recursive: true });
  fs.writeFileSync(jugadoresPath, "[]", "utf8");
}

// 👉 Función para leer jugadores
function leerJugadores() {
  try {
    const data = fs.readFileSync(jugadoresPath, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function guardarJugadores(data) {
  console.log("Guardando jugadores en:", jugadoresPath);
  fs.writeFileSync(jugadoresPath, JSON.stringify(data, null, 2));
}


// 👉 GET todos los jugadores
app.get("/api/jugadores", (req, res) => {
  const jugadores = leerJugadores();
  res.json(jugadores);
});

app.post("/api/jugadores", (req, res) => {
  console.log("📥 POST recibido:", req.body);

  const jugadores = leerJugadores();
  console.log("📂 Jugadores antes de agregar:", jugadores);

  const nuevo = { id: Date.now(), ...req.body };
  jugadores.push(nuevo);

  guardarJugadores(jugadores);

  console.log("📂 Jugadores después de guardar:", leerJugadores());

  res.json(nuevo);
});


// 👉 PUT actualizar jugador
app.put("/api/jugadores/:id", (req, res) => {
  const jugadores = leerJugadores();
  const index = jugadores.findIndex(j => j.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Jugador no encontrado" });
  jugadores[index] = { ...jugadores[index], ...req.body };
  guardarJugadores(jugadores);
  res.json(jugadores[index]);
});

// 👉 DELETE jugador
app.delete("/api/jugadores/:id", (req, res) => {
  let jugadores = leerJugadores();
  const index = jugadores.findIndex(j => j.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Jugador no encontrado" });
  jugadores.splice(index, 1);
  guardarJugadores(jugadores);
  res.json({ message: "Jugador eliminado" });
});

// Servir frontend desde public o scripts
app.use(express.static(path.join(__dirname, "public"))); // o "scripts" si tu JS está ahí

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
