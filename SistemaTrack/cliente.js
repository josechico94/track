// En tu aplicación 'Cliente', cuando alguien haga un pedido...
const { io } = require('socket.io-client');
const socket = io('http://localhost:4000');

const datosDelPedido = { pizza: 'pepperoni', cantidad: 2 };

// Enviar el pedido a la Central Telefónica (al servidor)
// Usa el mismo canal que para los mensajes urgentes
socket.emit('nuevo-pedido', datosDelPedido);