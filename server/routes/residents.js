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

    res.json({ resident });
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

    // ── Change flags — collected BEFORE entering $transaction ────────────
    const nameChanged    = updated.full_name !== undefined;
    const contactChanged = updated.contact    !== undefined;
    const statusChanged  = updated.status     !== undefined;

    if (!nameChanged && !contactChanged && !statusChanged) {
      await logActivity(req.user.id, 'UPDATE_RESIDENT', { resident_id: updated.resident_id, full_name: updated.full_name }, req);
      return res.json({ message: 'Resident updated', resident: updated });
    }

    // ── Sync linked Official ────────────────────────────────────────────────
    //
    //  How the Official for this Resident is found
    //  ─────────────────────────────────────────────────────────────────────
    //  Residents ↔ Officials have NO FK between them.  The linker is the
    //  users table.  In create-account the three records are written
    //  atomically:
    //      User.fullName    = fullname.trim()
    //      Resident.full_name = fullname.trim()
    //      Official.name      = fullname.trim()
    //  but those values can drift apart if edited separately afterwards,
    //  or if create-account was called with slightly different names on
    //  separate occasions.
    //
    //  We deliberately use LOWER/case-insensitive matching at every step
    //  because prisma 5.x removed mode: 'insensitive' from findUnique
    //  and findFirst.  The three-level resolution order below always
    //  covers every realistic combo:
    //
    //  1. resident.user_id → users.user_id → LOWER(fullName) LIKE on officials
    //     (residents are linked to users via user_id; this is the strongest
    //     match available)
    //  2. Fuzzy user lookup: LOWER(fullName) LIKE on the users table using
    //     the resident's current name as the search term
    //  3. Fuzzy direct official lookup: LOWER(name) LIKE on the officials
    //     table using the resident's current name
    //
    //  All writes use COALESCE so only changed fields are overwritten.
    await prisma.$transaction(async (tx) => {
      const is_active = updated.status === 'Active';

      let userNameForMatch = '';

      // ── Step 1a: resident.user_id → exact user record ───────────────
      if (existing.user_id) {
        const rows = await tx.$queryRawUnsafe(
          `SELECT user_id, fullName FROM users WHERE user_id = ? LIMIT 1`,
          existing.user_id
        );
        if (rows[0]?.fullName) userNameForMatch = rows[0].fullName;
      }

      // ── Step 1b: no user_id match → fuzzy on users by resident name ─
      if (!userNameForMatch) {
        const rows2 = await tx.$queryRawUnsafe(
          `SELECT user_id, fullName FROM users WHERE LOWER(fullName) LIKE LOWER(CONCAT('%', ?, '%')) LIMIT 1`,
          updated.full_name
        );
        if (rows2[0]?.fullName) userNameForMatch = rows2[0].fullName;
      }

      // ── Step 2: build WHERE clause for the UPDATE ───────────────────
      let whereClause = '';
      let whereValue  = '';

      if (userNameForMatch) {
        // Use LOWER/LIKE on the user's stored name so partial-name diffs
        // (e.g. user fullName "kevin" vs official name "Kevin Aguilar")
        // don't silently miss the target.
        whereClause = `LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))`;
        whereValue  = userNameForMatch;
      } else {
        // Step 3: search officials directly by the resident name
        whereClause = `LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))`;
        whereValue  = updated.full_name;
      }

// ── Step 3: run the UPDATE ───────────────────────────────────────
      await tx.$executeRawUnsafe(
        `UPDATE officials
           SET name      = COALESCE(?, name),
               contact   = COALESCE(?, contact),
               is_active = ?
         WHERE ${whereClause}`,
        nameChanged  ? updated.full_name  : null,
        contactChanged ? updated.contact   : null,
        is_active,
        whereValue
      );
    });

    await logActivity(req.user.id, 'UPDATE_RESIDENT', { resident_id: updated.resident_id, full_name: updated.full_name }, req);

    res.json({ message: 'Resident updated', resident: updated });
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

    // Find linked official - by user.fullName matching official.name
    let official = user ? await prisma.official.findFirst({
      where: { name: user.fullName }
    }) : null;
    
    // Fallback: try to find official by resident's full_name
    if (!official) {
      official = await prisma.official.findFirst({
        where: { name: resident.full_name }
      });
    }

    console.log('Delete resident cascade:', { 
      residentId: resident.resident_id, 
      residentName: resident.full_name,
      foundUser: user?.user_id, 
      foundOfficial: official?.official_id 
    });

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Archive the resident
      const { resident_id, ...residentData } = resident;
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
            linked_official_id: official?.official_id
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
        const { official_id, ...officialData } = official;
        await tx.archive.create({
          data: {
            title: official.name,
            description: `Official (linked to resident) archived`,
            category: 'OFFICIAL',
            entity_type: 'OFFICIAL',
            entity_id: official_id,
            entity_data: officialData,
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
