import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});


// Banco de dados em memória (mock)
let devices = [
  { id: "1", name: "Luz da sala", status: false },
  { id: "2", name: "Luz da sala 2", status: true },
  { id: "3", name: "Porta", status: true },
];

// Quando o ESP32 se conecta ao socket
io.on("connection", socket => {
  console.log("🔌 ESP32 conectado via Socket.IO:", socket.id);

  // Envia o estado inicial
  socket.emit("INIT", devices);

  // Recebe mensagens do ESP32
  socket.on("esp_event", data => {
    console.log("📩 ESP32 disse:", data);
  });
});


// GET - pegar lista de devices
app.get("/devices", (req, res) => {
  console.log('Buscando serviços...')
  res.json(devices);
});

// PATCH: altera status e envia comando ao ESP32
app.patch("/devices/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const index = devices.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Device não encontrado" });
  }

  // Atualizar estado no servidor
  devices[index].status = status;
  const device = devices[index]

  console.log(`Atualizado device [${device.name}] para status: ${device.status}`)

  io.emit("UPDATE", { id, status });
  const message = `${device.name} ${device.status? 'ligado' : 'desligado'} com sucesso`

  res.json({ message, device });
});

app.put("/devices/:id/name", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const device = devices.find(d => d.id === id);
  if (!device) return res.status(404).json({ error: "Device não encontrado" });

  device.name = name;

  const message = `${device.name} atualizado com sucesso`

  res.json({ message, device });
});

// POST - adicionar novo device (opcional)
app.post("/devices", (req, res) => {
  const { id, name, status } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: "id e name são obrigatórios" });
  }

  const newDevice = { id, name, status: !!status };
  devices.push(newDevice);

  res.status(201).json(newDevice);
});

// DELETE - remover device (opcional)
app.delete("/devices/:id", (req, res) => {
  const { id } = req.params;
  devices = devices.filter(dev => dev.id !== id);
  res.json({ status: "deleted" });
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("API rodando em http://localhost:3000");
});
