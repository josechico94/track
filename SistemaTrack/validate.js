export function validateOrder(body) {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('Cuerpo inválido.');
  if (!body.pizza || typeof body.pizza !== 'string') errors.push('pizza requerida.');
  const qty = Number(body.cantidad);
  if (!Number.isFinite(qty) || qty <= 0) errors.push('cantidad debe ser > 0.');
  return { ok: errors.length === 0, errors };
}
