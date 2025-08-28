import express from 'express';
import * as repo from '../repo/orders.memory.js';
import { validateOrder } from '../lib/validate.js';

const router = express.Router();

export default (io) => {
  router.post('/', (req, res) => {
    const v = validateOrder(req.body);
    if (!v.ok) return res.status(400).json({ errors: v.errors });

    const created = repo.create(req.body);
    io.emit('order:urgent', created);
    return res.status(201).json(created);
  });

  router.get('/', (_req, res) => res.json(repo.list()));

  router.get('/:id', (req, res) => {
    const found = repo.get(req.params.id);
    if (!found) return res.status(404).json({ error: 'No encontrado' });
    res.json(found);
  });

  return router;
};
