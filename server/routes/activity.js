import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Helper to log activity
export const logActivity = async (userId, action, details = null, req = null) => {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        ip_address: req?.ip || req?.connection?.remoteAddress
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// GET /api/activity/log
router.get('/log', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const activities = await prisma.activityLog.findMany({
      take: parseInt(limit),
      include: {
        user: {
          select: { username: true, fullName: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// POST /api/activity/log (helper to create activity logs)
router.post('/log', authenticate, async (req, res) => {
  try {
    const { action, details } = req.body;

    await prisma.activityLog.create({
      data: {
        user_id: req.user.id,
        action,
        details: details ? JSON.stringify(details) : null,
        ip_address: req.ip || req.connection.remoteAddress
      }
    });

    res.status(201).json({ message: 'Activity logged' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /api/activity/dashboard-stats (public endpoint)
router.get('/dashboard', async (req, res) => {
  try {
    const recent = await prisma.activityLog.findMany({
      take: 10,
      include: {
        user: {
          select: { username: true, fullName: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ recent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/activity/demographics
router.get('/demographics', async (req, res) => {
  try {
    const residents = await prisma.resident.findMany({
      where: { status: 'Active' },
      select: { age: true }
    });

    const children = residents.filter(r => r.age != null && r.age <= 17).length;
    const adults = residents.filter(r => r.age != null && r.age >= 18 && r.age <= 59).length;
    const seniors = residents.filter(r => r.age != null && r.age >= 60).length;

    res.json({ children, adults, seniors, total: residents.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch demographics' });
  }
});

// GET /api/activity/gender-demographics
router.get('/gender-demographics', async (req, res) => {
  try {
    const residents = await prisma.resident.findMany({
      where: { status: 'Active' },
      select: { gender: true }
    });

    const counts = {};
    for (const r of residents) {
      const key = (r.gender || 'Unspecified').trim() || 'Unspecified';
      counts[key] = (counts[key] || 0) + 1;
    }

    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gender demographics' });
  }
});

// ============================================================
// DELETE /api/activity/log (Admin only)
// ============================================================
router.delete('/log', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No activity IDs provided' });
    }

    const intIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (intIds.length === 0) {
      return res.status(400).json({ error: 'Invalid activity IDs' });
    }

    const logIds = intIds.filter(id => id !== req.user.id);
    if (logIds.length < intIds.length) {
      const deletedCount = await prisma.activityLog.deleteMany({ where: { activity_log_id: { in: logIds } } });
      return res.status(207).json({ message: `${deletedCount} activity log(s) deleted (own entries skipped)`, deleted: deletedCount, skipped: intIds.length - logIds.length });
    }

    const result = await prisma.activityLog.deleteMany({
      where: { activity_log_id: { in: intIds } }
    });

    res.json({ message: `${result.count} activity log(s) deleted`, deleted: result.count });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity log entries' });
  }
});

export default router;