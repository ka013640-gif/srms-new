import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';

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
            AND deleted_at IS NULL
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
            AND deleted_at IS NULL
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

    await logActivity(req.user.id, 'DELETE_OFFICIAL', { official_id: official.official_id, name: official.name }, req);

     res.json({ message: 'Official moved to archives' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove official' });
  }
});

export default router;
