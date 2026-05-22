import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';
import bcryptjs from 'bcryptjs';

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
    const { name, position, contact, term_start, term_end, is_active, user_id } = req.body;

    let targetUserId = user_id;
    
    if (!targetUserId) {
      // Try to find existing user by name match
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { fullName: name },
            { username: name.toLowerCase().replace(/\s+/g, '_') }
          ]
        }
      });
      
      if (existingUser) {
        targetUserId = existingUser.user_id;
      } else {
        // Create new user for this official
        const username = name.toLowerCase().replace(/\s+/g, '_');
        const defaultPassword = 'official123';
        const hashedPassword = await bcryptjs.hash(defaultPassword, 10);
        
        const newUser = await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            fullName: name,
            role: 'OFFICIAL'
          }
        });
        targetUserId = newUser.user_id;
      }
    }

    const official = await prisma.official.create({
      data: {
        name,
        position,
        contact,
        term_start: term_start ? new Date(term_start) : new Date(),
        term_end: term_end ? new Date(term_end) : null,
        is_active: is_active ?? true,
        user_id: targetUserId
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
    const { name, position, contact, term_start, term_end, is_active, user_id } = req.body;

    const official = await prisma.official.update({
      where: { official_id: parseInt(req.params.official_id) },
      data: {
        name,
        position,
        contact,
        term_start: term_start ? new Date(term_start) : undefined,
        term_end: term_end ? new Date(term_end) : undefined,
        is_active,
        ...(user_id !== undefined && { user_id })
      }
    });

    // ── Sync linked Resident ────────────────────────────────────────────────
    // Uses the user_id FK relationship: official.user_id → resident.user_id
    let syncRowsRes = 0;
    if (official.user_id) {
      const updated = await prisma.resident.updateMany({
        where: { user_id: official.user_id },
        data: {
          ...(name !== undefined && { full_name: name }),
          ...(contact !== undefined && { contact }),
          status: official.is_active ? 'Active' : 'Inactive'
        }
      });
      syncRowsRes = updated.count;
    } else {
      // Fallback: match by name when user_id not linked
      const updated = await prisma.resident.updateMany({
        where: { full_name: { contains: official.name } },
        data: {
          ...(name !== undefined && { full_name: name }),
          ...(contact !== undefined && { contact }),
          status: official.is_active ? 'Active' : 'Inactive'
        }
      });
      syncRowsRes = updated.count;
    }

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

    // Find linked user via the explicit user_id FK on officials
    let user = official.user_id
      ? await prisma.user.findUnique({
          where: { user_id: official.user_id }
        })
      : null;

    // Find linked resident — use the direct user_id relationship
    let resident = user
      ? await prisma.resident.findFirst({
          where: { user_id: user.user_id }
        })
      : null;

    console.log('Delete official cascade:', { 
      officialId: official.official_id, 
      officialName: official.name,
      foundUser: user?.user_id, 
      foundResident: resident?.resident_id 
    });

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Archive the official - exclude user_id to avoid FK issues on restore
      const { official_id, user_id: offUserId, ...officialData } = official;
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
          const { resident_id, user_id: resUserId, ...residentData } = resident;
          await tx.archive.create({
            data: {
              title: resident.full_name,
              description: `Resident (linked to official) archived`,
              category: 'RESIDENT',
              entity_type: 'RESIDENT',
              entity_id: resident_id,
              entity_data: {
                ...residentData,
                linked_user_id: user?.user_id,
                linked_official_id: official.official_id
              },
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
