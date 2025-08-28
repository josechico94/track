import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import sockets from './sockets/index.js';
import ordersRouterFactory from './routes/orders.routes.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' } });

// REST
app.use('/orders', ordersRouterFactory(io));

// Sockets
sockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API+WS en http://localhost:${PORT}`);
});
