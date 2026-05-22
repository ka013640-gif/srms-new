import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';

const router = express.Router();

// GET /api/officials
router.get('/', authenticate, async (req, res) => {
  try {
    const officials = await prisma.official.findMany({
      orderBy: { created_at: 'desc' }
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
      where: { official_id: parseInt(req.params.official_id) }
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

    await logActivity(req.user.id, 'CREATE_OFFICIAL', { official_id: official.official_id, name: official.name }, req);

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

    // ── Sync linked Resident ────────────────────────────────────────────────
    // $executeRaw is a Prisma tag function — must be called with a
    // tagged template literal.  Parameters embedded via ${} are
    // safely parameterised by the Prisma engine.
    let syncRowsRes = 0;
    await prisma.$transaction(async (tx) => {
      const newStatus = official.is_active ? 'Active' : 'Inactive';

      // 1. Resolve via User (exact name match in users table)
      const matchingUser = await tx.user.findFirst({
        where: { fullName: official.name }
      });

      if (matchingUser) {
        const res = await tx.$executeRaw`
          UPDATE residents
          SET full_name = COALESCE(${official.name}, full_name),
              contact   = COALESCE(${official.contact}, contact),
              status    = COALESCE(${newStatus}, status)
          WHERE user_id = ${matchingUser.user_id}
        `;
        syncRowsRes = res?.affectedRows ?? 0;
      } else {
        // 2. Fallback: fuzzy match via LOWER / CONCAT
        const res = await tx.$executeRaw`
          UPDATE residents
          SET full_name = COALESCE(${official.name}, full_name),
              contact   = COALESCE(${official.contact}, contact),
              status    = COALESCE(${newStatus}, status)
          WHERE LOWER(full_name) LIKE LOWER(CONCAT('%', ${official.name}, '%'))
        `;
        syncRowsRes = res?.affectedRows ?? 0;
      }
    });

    await logActivity(req.user.id, 'UPDATE_OFFICIAL', { official_id: official.official_id, name: official.name, sync_rows: syncRowsRes }, req);

    res.json({
      message: 'Official updated',
      official,
      sync: { rows_affected: syncRowsRes }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update official' });
  }
});

// DELETE /api/officials/:official_id (Admin only) - move to archives with cascade
router.delete('/:official_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const official = await prisma.official.findUnique({
      where: { official_id: parseInt(req.params.official_id) }
    });

    if (!official) {
      return res.status(404).json({ error: 'Official not found' });
    }

    // Find linked user - try exact match first, then case-insensitive
    let user = await prisma.user.findFirst({
      where: { fullName: official.name }
    });
    if (!user) {
      const users = await prisma.$queryRawUnsafe(
        `SELECT * FROM users WHERE LOWER(fullName) = LOWER(?) LIMIT 1`,
        official.name
      );
      user = users[0] || null;
    }

    // Check if user was already deleted (check if they exist)
    if (user) {
      const userCheck = await prisma.user.findUnique({
        where: { user_id: user.user_id }
      });
      if (!userCheck) user = null;
    }

    // Find linked resident - by user_id or by matching full_name
    let resident = user ? await prisma.resident.findFirst({
      where: { user_id: user.user_id }
    }) : null;
    
    if (!resident) {
      resident = await prisma.resident.findFirst({
        where: { full_name: official.name }
      });
    }

    console.log('Delete official cascade:', { 
      officialId: official.official_id, 
      officialName: official.name,
      foundUser: user?.user_id, 
      foundResident: resident?.resident_id 
    });

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Archive the official
      const { official_id, ...officialData } = official;
      await tx.archive.create({
        data: {
          title: official.name,
          description: `Official record archived`,
          category: 'OFFICIAL',
          entity_type: 'OFFICIAL',
          entity_id: official_id,
          entity_data: {
            ...officialData,
            linked_user_id: user?.user_id,
            linked_resident_id: resident?.resident_id
          },
          archived_by: req.user.id
        }
      });

      // Delete official
      await tx.official.delete({
        where: { official_id: parseInt(req.params.official_id) }
      });

      // Also archive and delete linked resident if exists and not already archived
      if (resident) {
        // Check if resident still exists
        const residentExists = await tx.resident.findUnique({
          where: { resident_id: resident.resident_id }
        });
        
        if (residentExists) {
          const { resident_id, ...residentData } = resident;
          await tx.archive.create({
            data: {
              title: resident.full_name,
              description: `Resident (linked to official) archived`,
              category: 'RESIDENT',
              entity_type: 'RESIDENT',
              entity_id: resident_id,
              entity_data: residentData,
              archived_by: req.user.id
            }
          });
          await tx.resident.delete({
            where: { resident_id: resident.resident_id }
          });
        }
      }

      // Delete linked user if exists (after all references are cleared)
      if (user) {
        await tx.user.delete({
          where: { user_id: user.user_id }
        });
      }
    });

    await logActivity(req.user.id, 'DELETE_OFFICIAL', {
      official_id: official.official_id,
      name: official.name,
      deleted_user: user?.user_id,
      deleted_resident: resident?.resident_id
    }, req);

    res.json({ message: 'Official moved to archives' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove official' });
  }
});

export default router;
