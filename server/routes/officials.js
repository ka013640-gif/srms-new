import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/officials
router.get('/', authenticate, async (req, res) => {
  try {
    const officials = await prisma.official.findMany({
      orderBy: { created_at: 'desc' },
      where: { deleted_at: null }
    });

    res.json({ officials });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch officials' });
  }
});

// GET /api/officials/:official_id
router.get('/:official_id', authenticate, async (req, res) => {
  try {
    const official = await prisma.official.findUnique({
      where: { official_id: parseInt(req.params.official_id), deleted_at: null }
    });

    if (!official) {
      res.status(404).json({ error: 'Official not found' });
      return;
    }

    res.json({ official });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch official' });
  }
});

// POST /api/officials (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, position, contact, term_start, term_end, is_active } = req.body;

    const official = await prisma.official.create({
      data: {
        name,
        position,
        contact,
        term_start: term_start ? new Date(term_start) : new Date(),
        term_end: term_end ? new Date(term_end) : null,
        is_active: is_active ?? true
      }
    });

    res.status(201).json({ message: 'Official added', official });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create official' });
  }
});

// PUT /api/officials/:official_id (Admin only)
router.put('/:official_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, position, contact, term_start, term_end, is_active } = req.body;

    const official = await prisma.official.update({
      where: { official_id: parseInt(req.params.official_id) },
      data: {
        name,
        position,
        contact,
        term_start: term_start ? new Date(term_start) : undefined,
        term_end: term_end ? new Date(term_end) : undefined,
        is_active
      }
    });

    res.json({ message: 'Official updated', official });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update official' });
  }
});

// DELETE /api/officials/:official_id (Admin only) - soft delete to archive
router.delete('/:official_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const official = await prisma.official.findUnique({
      where: { official_id: parseInt(req.params.official_id) }
    });

    if (!official) {
      return res.status(404).json({ error: 'Official not found' });
    }

    await prisma.official.update({
      where: { official_id: parseInt(req.params.official_id) },
      data: { deleted_at: new Date() }
    });

    res.json({ message: 'Official moved to archives' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove official' });
  }
});

export default router;
