import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';

const router = express.Router();

// GET /api/sessions
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let where = {};
    if (start_date && end_date) {
      where = {
        date: {
          gte: new Date(start_date),
          lte: new Date(end_date)
        }
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        session_id: true, title: true, description: true,
        date: true, time: true, location: true, status: true,
        created_at: true, updated_at: true
      }
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:session_id
router.get('/:session_id', authenticate, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { session_id: parseInt(req.params.session_id) },
      select: {
        session_id: true, title: true, description: true,
        date: true, time: true, location: true, status: true,
        created_at: true, updated_at: true
      }
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
    const { attendees: _att, ...rest } = req.body;

    const session = await prisma.session.create({
      data: {
        title: rest.title,
        description: rest.description,
        date: new Date(rest.date),
        time: rest.time,
        location: rest.location,
        status: rest.status
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
    // Strip stale/unsupported fields before forwarding to Prisma
    const { attendees: _att, ...rest } = req.body;

    const session = await prisma.session.update({
      where: { session_id: parseInt(req.params.session_id) },
      data: {
        ...rest,
        date: rest.date ? new Date(rest.date) : undefined
      }
    });

    await logActivity(req.user.id, 'UPDATE_SESSION', { session_id: session.session_id, title: session.title }, req);

     res.json({ message: 'Session updated', session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:session_id (Admin only) - move to archives
router.delete('/:session_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { session_id: parseInt(req.params.session_id) }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { session_id, ...sessionData } = session;
    await prisma.archive.create({
      data: {
        title: session.title,
        description: `Session record archived`,
        category: 'SESSION',
        entity_type: 'SESSION',
        entity_id: session_id,
        entity_data: sessionData,
        archived_by: req.user.id
      }
    });

    await prisma.session.delete({
      where: { session_id: parseInt(req.params.session_id) }
    });

    await logActivity(req.user.id, 'DELETE_SESSION', { session_id: session.session_id, title: session.title }, req);

    res.json({ message: 'Session moved to archives' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
