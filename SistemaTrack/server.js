// Código para tu Central Telefónica (server.js)
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, { cors: { origin: '*' } });

// Aquí guardamos los mensajes que llegan, como un cuaderno de pedidos
const mensajesDePedidos = [];

// Regla 1: Cuando llega un nuevo pedido de 'Cliente'
app.post('/nuevo-pedido', (req, res) => {
  const pedido = req.body;
  mensajesDePedidos.push(pedido);
  console.log('Un nuevo pedido ha llegado:', pedido);

  // ¡Aviso urgente a 'Luigi' por el sistema de mensajes rápidos!
  io.emit('pedido-urgente', pedido);

  res.status(200).send('Pedido recibido. Gracias.');
});

// Regla 2: Cuando 'Luigi' pide la lista de todos los pedidos
app.get('/todos-los-pedidos', (req, res) => {
  res.status(200).json(mensajesDePedidos);
});

// Regla 3: Cuando un amigo se conecta a la central
io.on('connection', (socket) => {
  console.log('Un amigo se ha conectado a la central.');
});

// ¡Enciende la central en el puerto 4000!
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Central telefónica en línea en http://localhost:${PORT}`);
});

// En tu aplicación 'Luigi'...
const { io } = require('socket.io-client');
const socket = io('http://localhost:4000'); // Conéctate a la central

// 1. Escuchar los mensajes urgentes que lleguen
socket.on('pedido-urgente', (nuevoPedido) => {
  console.log('¡Alerta! Nuevo pedido urgente recibido:', nuevoPedido);
  // Aquí, actualiza tu pantalla para mostrar el nuevo pedido
});

// 2. Pedir la lista de todos los pedidos al iniciar
fetch('http://localhost:4000/todos-los-pedidos')
  .then(respuesta => respuesta.json())
  .then(historial => console.log('Historial de pedidos:', historial))
  .catch(error => console.error('Error:', error));
  
