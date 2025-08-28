const orders = []; // { id, pizza, cantidad, createdAt }

function genId() {
  return 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function create(payload) {
  const id = payload.id || genId();
  const order = {
    id,
    pizza: String(payload.pizza),
    cantidad: Number(payload.cantidad),
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  return order;
}

export function list() {
  return orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function get(id) {
  return orders.find(o => o.id === id) || null;
}
