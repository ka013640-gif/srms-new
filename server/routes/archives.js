import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/archives - Get all archived entries (Admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const archives = await prisma.archive.findMany({
      orderBy: { created_at: 'desc' }
    });

    res.json({ archives });
  } catch (error) {
    console.error('Failed to fetch archives:', error);
    res.status(500).json({ error: 'Failed to fetch archives' });
  }
});

// POST /api/archives/:id/restore - Restore entry from archive (Admin only)
router.post('/:id/restore', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const archive = await prisma.archive.findUnique({
      where: { archive_id: parseInt(id) }
    });

    if (!archive) {
      return res.status(404).json({ error: 'Archive entry not found' });
    }

    const { entity_type, entity_data } = archive;

    // Restore based on entity type
    switch (entity_type) {
      case 'RESIDENT':
        await prisma.resident.create({ data: entity_data });
        break;
      case 'PROJECT':
        await prisma.project.create({ data: entity_data });
        break;
      case 'SESSION':
        await prisma.session.create({ data: entity_data });
        break;
      case 'OFFICIAL':
        await prisma.official.create({ data: entity_data });
        break;
      case 'DOCUMENT_REQUEST':
        await prisma.documentRequest.create({ data: entity_data });
        break;
      case 'ANNOUNCEMENT':
        await prisma.announcement.create({ data: entity_data });
        break;
      default:
        return res.status(400).json({ error: `Unknown entity type: ${entity_type}` });
    }

    // Delete from archives after successful restore
    await prisma.archive.delete({ where: { archive_id: parseInt(id) } });

    res.json({ message: `${entity_type.toLowerCase()} restored successfully` });
  } catch (error) {
    console.error('Failed to restore entry:', error);
    res.status(500).json({ error: 'Failed to restore entry' });
  }
});

// DELETE /api/archives/:id/permanent - Permanently delete from archive (Admin only)
router.delete('/:id/permanent', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const archive = await prisma.archive.findUnique({
      where: { archive_id: parseInt(id) }
    });

    if (!archive) {
      return res.status(404).json({ error: 'Archive entry not found' });
    }

    await prisma.archive.delete({
      where: { archive_id: parseInt(id) }
    });

    res.json({ message: 'Entry permanently deleted' });
  } catch (error) {
    console.error('Failed to permanently delete entry:', error);
    res.status(500).json({ error: 'Failed to permanently delete entry' });
  }
});

export default router;