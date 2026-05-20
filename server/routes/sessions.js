import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';

const router = express.Router();

// GET /api/sessions
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let where = { deleted_at: null };
    if (start_date && end_date) {
      where = {
        deleted_at: null,
        date: {
          gte: new Date(start_date),
          lte: new Date(end_date)
        }
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:session_id
router.get('/:session_id', authenticate, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { session_id: parseInt(req.params.session_id), deleted_at: null }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/sessions (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { title, description, date, time, location, attendees, status } = req.body;

const session = await prisma.session.create({
       data: {
         title,
         description,
         date: new Date(date),
         time,
         location,
         attendees: attendees ? JSON.stringify(attendees) : null,
         status
       }
     });

    await logActivity(req.user.id, 'CREATE_SESSION', { session_id: session.session_id, title: session.title }, req);

     res.status(201).json({ message: 'Session created', session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// PUT /api/sessions/:session_id (Admin only)
router.put('/:session_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
const session = await prisma.session.update({
       where: { session_id: parseInt(req.params.session_id) },
       data: {
         ...req.body,
         date: req.body.date ? new Date(req.body.date) : undefined
       }
     });

    await logActivity(req.user.id, 'UPDATE_SESSION', { session_id: session.session_id, title: session.title }, req);

     res.json({ message: 'Session updated', session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:session_id (Admin only) - soft delete to archive
router.delete('/:session_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { session_id: parseInt(req.params.session_id) }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

await prisma.session.update({
       where: { session_id: parseInt(req.params.session_id) },
       data: { deleted_at: new Date() }
     });

    await logActivity(req.user.id, 'DELETE_SESSION', { session_id: session.session_id, title: session.title }, req);

     res.json({ message: 'Session moved to archives' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
