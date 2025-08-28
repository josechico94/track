import * as repo from '../repo/orders.memory.js';
import { validateOrder } from '../lib/validate.js';

export default (io) => {
  io.on('connection', (socket) => {
    // crear pedido por socket
    socket.on('order:new', (payload) => {
      const v = validateOrder(payload);
      if (!v.ok) return socket.emit('order:created', { ok: false, errors: v.errors });

      const created = repo.create(payload);
      socket.emit('order:created', { ok: true, order: created });
      socket.broadcast.emit('order:urgent', created);
    });

    // historial
    socket.on('order:history', () => {
      socket.emit('order:history', repo.list());
    });
  });
};
