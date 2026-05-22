import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, residentValidation } from '../middleware/validate.js';
import { logActivity } from './activity.js';

const router = express.Router();

// GET /api/residents/stats (active count only - public endpoint)
router.get('/stats', async (req, res) => {
  try {
    const active = await prisma.resident.count({
      where: { status: 'Active' }
    });
    res.json({ active });
  } catch (error) {
    console.error('Error fetching active resident count:', error);
    res.status(500).json({ error: 'Failed to fetch active resident count' });
  }
});

// GET /api/residents/stats/all (dashboard stats - admin only)
router.get('/stats/all', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const total = await prisma.resident.count();
    const active = await prisma.resident.count({
      where: { status: 'Active' }
    });

    res.json({ total, active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/residents (list all residents)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = '', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    let orderBy = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy = { full_name: 'asc' };
    }

    const [residents, total] = await Promise.all([
      prisma.resident.findMany({
        skip: parseInt(offset),
        take: parseInt(limit),
        orderBy,
        include: { user: { select: { username: true } } }
      }),
      prisma.resident.count()
    ]);

    res.json({
      residents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch residents' });
  }
});

// GET /api/residents/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const resident = await prisma.resident.findUnique({
      where: { resident_id: parseInt(req.params.id) }
    });

    if (!resident) {
      res.status(404).json({ error: 'Resident not found' });
      return;
    }

    // Residents may only view their own profile
    if (req.user.role !== 'ADMIN' && (!resident.user_id || resident.user_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Also fetch linked official (if any) by user_id FK
    let official = null;
    if (resident.user_id) {
      official = await prisma.official.findFirst({
        where: { user_id: resident.user_id },
        select: { official_id: true, position: true, contact: true, term_start: true, term_end: true, is_active: true }
      });
    }

    res.json({ resident, official });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resident' });
  }
});

// POST /api/residents (create) - Admin or self-create
router.post('/', authenticate, async (req, res) => {
  try {
    const { birthday, ...rest } = req.body;

    // Residents and officials may only create a profile for themselves
    if (!['ADMIN', 'OFFICIAL'].includes(req.user.role)) {
      const existing = await prisma.resident.findFirst({
        where: { user_id: req.user.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'Resident profile already exists for this account' });
      }
    }

    const data = {
      ...rest,
      birthday: birthday ? new Date(birthday) : new Date()
    };
    // Auto-link to the logged-in user when a resident creates their own record
    if (req.user.role !== 'ADMIN') {
      data.user_id = req.user.id;
    }

    const resident = await prisma.resident.create({ data });

    await logActivity(req.user.id, 'CREATE_RESIDENT', { full_name: resident.full_name }, req);

    res.status(201).json({ message: 'Resident profile created', resident });
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({ error: 'Failed to create resident', details: error.message });
  }
});

// PUT /api/residents/:id - Admin or own profile only
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { birthday, ...rest } = req.body;
    const existing = await prisma.resident.findUnique({
      where: { resident_id: parseInt(req.params.id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Residents may only edit their own profile
    if (!['ADMIN', 'OFFICIAL'].includes(req.user.role)) {
      if (!existing.user_id || existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updated = await prisma.resident.update({
      where: { resident_id: parseInt(req.params.id) },
      data: {
        ...rest,
        birthday: birthday ? new Date(birthday) : undefined
      }
    });

    // ── Detect which fields actually changed compared to the pre-update copy ─
    const nameChanged    = rest.full_name  !== undefined && updated.full_name !== existing.full_name;
    const contactChanged = rest.contact    !== undefined && updated.contact   !== existing.contact;
    const statusChanged  = rest.status     !== undefined && updated.status    !== existing.status;

    if (!nameChanged && !contactChanged && !statusChanged) {
      await logActivity(req.user.id, 'UPDATE_RESIDENT', { resident_id: updated.resident_id, full_name: updated.full_name }, req);
      return res.json({ message: 'Resident updated', resident: updated });
    }

    // ── Sync linked Official ────────────────────────────────────────────────
    // Uses the user_id FK relationship: resident.user_id → official.user_id
    let syncRowsOfficial = 0;
    if (updated.user_id) {
      const updatedOfficial = await prisma.official.updateMany({
        where: { user_id: updated.user_id },
        data: {
          ...(nameChanged && { name: updated.full_name }),
          ...(contactChanged && { contact: updated.contact }),
          is_active: updated.status === 'Active'
        }
      });
      syncRowsOfficial = updatedOfficial.count;
    } else {
      // Fallback: match by name when user_id not linked
      const nameToMatch = nameChanged ? updated.full_name : existing.full_name;
      const updatedOfficial = await prisma.official.updateMany({
        where: { name: { contains: nameToMatch } },
        data: {
          ...(nameChanged && { name: updated.full_name }),
          ...(contactChanged && { contact: updated.contact }),
          is_active: updated.status === 'Active'
        }
      });
      syncRowsOfficial = updatedOfficial.count;
    }

    await logActivity(req.user.id, 'UPDATE_RESIDENT', { resident_id: updated.resident_id, full_name: updated.full_name, sync_rows: syncRowsOfficial }, req);

    res.json({ message: 'Resident updated', resident: updated, sync: { rows_affected: syncRowsOfficial } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update resident', details: error.message });
  }
});

// DELETE /api/residents/:id - Admin only (move to archives with cascade)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const resident = await prisma.resident.findUnique({
      where: { resident_id: parseInt(req.params.id) }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Find linked user - by user_id
    const user = resident.user_id ? await prisma.user.findUnique({
      where: { user_id: resident.user_id }
    }) : null;

    // Find linked official: query through the explicit user_id FK on the
    // officials table so we never match by name alone
    const official = user
      ? await prisma.official.findFirst({
          where: { user_id: resident.user_id }
        })
      : null;

    console.log('Delete resident cascade:', {
      residentId: resident.resident_id,
      residentName: resident.full_name,
      foundUser: user?.user_id,
      foundOfficial: official?.official_id
    });

     // Use transaction to ensure atomicity
     await prisma.$transaction(async (tx) => {
       // Archive the resident - exclude user_id to avoid FK issues on restore
       const { resident_id, user_id, ...residentData } = resident;
       // Archive linked user data if exists
       const userData = user ? {
         username: user.username,
         password: user.password,
         role: user.role,
         fullName: user.fullName,
         email: user.email
       } : null;
       await tx.archive.create({
         data: {
           title: resident.full_name,
           description: `Resident record archived`,
           category: 'RESIDENT',
           entity_type: 'RESIDENT',
           entity_id: resident_id,
           entity_data: {
             ...residentData,
             linked_user_id: user?.user_id,
             linked_official_id: official?.official_id,
             ...(userData && { user_data: userData })
           },
           archived_by: req.user.id
         }
       });

      // Delete resident
      await tx.resident.delete({
        where: { resident_id: parseInt(req.params.id) }
      });

      // Also archive and delete linked official if exists
      if (official) {
        const { official_id, user_id: offUserId, ...officialData } = official;
        await tx.archive.create({
          data: {
            title: official.name,
            description: `Official (linked to resident) archived`,
            category: 'OFFICIAL',
            entity_type: 'OFFICIAL',
            entity_id: official_id,
            entity_data: {
              ...officialData,
              linked_user_id: user?.user_id,
              linked_resident_id: resident.resident_id
            },
            archived_by: req.user.id
          }
        });
        await tx.official.delete({
          where: { official_id: official.official_id }
        });
      }

      // Delete linked user if exists
      if (user) {
        await tx.user.delete({
          where: { user_id: user.user_id }
        });
      }
    });

    await logActivity(req.user.id, 'DELETE_RESIDENT', {
      resident_id: resident.resident_id,
      full_name: resident.full_name,
      deleted_user: user?.user_id,
      deleted_official: official?.official_id
    }, req);

    res.json({ message: 'Resident moved to archives' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resident' });
  }
});

export default router;
