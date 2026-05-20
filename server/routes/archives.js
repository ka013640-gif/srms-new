import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/archives - Get all archived entries (Admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const [residents, projects, sessions, officials] = await Promise.all([
      prisma.resident.findMany({
        where: { deleted_at: { not: null } },
        orderBy: { deleted_at: 'desc' }
      }),
      prisma.project.findMany({
        where: { deleted_at: { not: null } },
        orderBy: { deleted_at: 'desc' }
      }),
      prisma.session.findMany({
        where: { deleted_at: { not: null } },
        orderBy: { deleted_at: 'desc' }
      }),
      prisma.official.findMany({
        where: { deleted_at: { not: null } },
        orderBy: { deleted_at: 'desc' }
      })
    ]);

    const archives = [
      ...residents.map(r => ({ ...r, entity_type: 'RESIDENT' })),
      ...projects.map(p => ({ ...p, entity_type: 'PROJECT' })),
      ...sessions.map(s => ({ ...s, entity_type: 'SESSION' })),
      ...officials.map(o => ({ ...o, entity_type: 'OFFICIAL' }))
    ].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

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
    
    // Find which table has this ID
    const resident = await prisma.resident.findFirst({ 
      where: { resident_id: parseInt(id), deleted_at: { not: null } } 
    });
    const project = await prisma.project.findFirst({ 
      where: { project_id: parseInt(id), deleted_at: { not: null } } 
    });
    const session = await prisma.session.findFirst({ 
      where: { session_id: parseInt(id), deleted_at: { not: null } } 
    });
    const official = await prisma.official.findFirst({ 
      where: { official_id: parseInt(id), deleted_at: { not: null } } 
    });

    if (resident) {
      await prisma.resident.update({
        where: { resident_id: parseInt(id) },
        data: { deleted_at: null }
      });
      return res.json({ message: 'Resident restored successfully' });
    }
    
    if (project) {
      await prisma.project.update({
        where: { project_id: parseInt(id) },
        data: { deleted_at: null }
      });
      return res.json({ message: 'Project restored successfully' });
    }
    
    if (session) {
      await prisma.session.update({
        where: { session_id: parseInt(id) },
        data: { deleted_at: null }
      });
      return res.json({ message: 'Session restored successfully' });
    }

    if (official) {
      await prisma.official.update({
        where: { official_id: parseInt(id) },
        data: { deleted_at: null }
      });
      return res.json({ message: 'Official restored successfully' });
    }

    return res.status(404).json({ error: 'Archive entry not found' });
  } catch (error) {
    console.error('Failed to restore entry:', error);
    res.status(500).json({ error: 'Failed to restore entry' });
  }
});

// DELETE /api/archives/:id/permanent - Permanently delete from archive (Admin only)
router.delete('/:id/permanent', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find which table has this ID
    const resident = await prisma.resident.findFirst({ 
      where: { resident_id: parseInt(id), deleted_at: { not: null } } 
    });
    const project = await prisma.project.findFirst({ 
      where: { project_id: parseInt(id), deleted_at: { not: null } } 
    });
    const session = await prisma.session.findFirst({ 
      where: { session_id: parseInt(id), deleted_at: { not: null } } 
    });
    const official = await prisma.official.findFirst({ 
      where: { official_id: parseInt(id), deleted_at: { not: null } } 
    });

    if (resident) {
      await prisma.resident.delete({
        where: { resident_id: parseInt(id) }
      });
      return res.json({ message: 'Resident permanently deleted' });
    }
    
    if (project) {
      await prisma.project.delete({
        where: { project_id: parseInt(id) }
      });
      return res.json({ message: 'Project permanently deleted' });
    }
    
    if (session) {
      await prisma.session.delete({
        where: { session_id: parseInt(id) }
      });
      return res.json({ message: 'Session permanently deleted' });
    }

    if (official) {
      await prisma.official.delete({
        where: { official_id: parseInt(id) }
      });
      return res.json({ message: 'Official permanently deleted' });
    }

    return res.status(404).json({ error: 'Archive entry not found' });
  } catch (error) {
    console.error('Failed to permanently delete entry:', error);
    res.status(500).json({ error: 'Failed to permanently delete entry' });
  }
});

export default router;