import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/archives
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const archives = await prisma.archive.findMany({
      orderBy: { created_at: 'desc' }
    });

    res.json({ archives });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

// POST /api/archives (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { title, description, category, file_path } = req.body;

    const archive = await prisma.archive.create({
      data: {
        title,
        description,
        category,
        file_path,
        uploaded_by: req.user.id
      }
    });

    res.status(201).json({ message: 'Archive created', archive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create archive' });
  }
});

// DELETE /api/archives/:id (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.archive.delete({
      where: { archive_id: parseInt(req.params.id) }
    });

    res.json({ message: 'Archive deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete archive' });
  }
});

export default router;