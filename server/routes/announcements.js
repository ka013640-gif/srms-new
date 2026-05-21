import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';

const router = express.Router();

// GET /api/announcements — all authenticated users can view (only non-deleted)
router.get('/', authenticate, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json({ announcements });
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// GET /api/announcements/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { announcement_id: parseInt(req.params.id) }
    });
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ announcement });
  } catch (error) {
    console.error('Failed to fetch announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// POST /api/announcements — ADMIN or OFFICIAL can create
router.post('/', authenticate, authorize('ADMIN', 'OFFICIAL'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content: content || '',
        user_id: req.user.id
      }
    });
    await logActivity(req.user.id, 'CREATE_ANNOUNCEMENT', { announcement_id: announcement.announcement_id, title: announcement.title }, req);
    res.status(201).json({ message: 'Announcement created', announcement });
  } catch (error) {
    console.error('Failed to create announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// PUT /api/announcements/:id — ADMIN or OFFICIAL can edit
router.put('/:id', authenticate, authorize('ADMIN', 'OFFICIAL'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const announcement = await prisma.announcement.update({
      where: { announcement_id: parseInt(req.params.id) },
      data: { title, content: content || '' }
    });
    await logActivity(req.user.id, 'UPDATE_ANNOUNCEMENT', { announcement_id: announcement.announcement_id, title: announcement.title }, req);
    res.json({ message: 'Announcement updated', announcement });
  } catch (error) {
    console.error('Failed to update announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// DELETE /api/announcements/:id — ADMIN only (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.announcement.update({
      where: { announcement_id: parseInt(req.params.id) },
      data: { deleted_at: new Date() }
    });
    await logActivity(req.user.id, 'DELETE_ANNOUNCEMENT', { announcement_id: req.params.id }, req);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
