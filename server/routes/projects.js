import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, projectValidation } from '../middleware/validate.js';
import { logActivity } from './activity.js';

const router = express.Router();

// GET /api/projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { created_at: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:project_id
router.get('/:project_id', authenticate, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { project_id: parseInt(req.params.project_id) }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects (Admin only)
router.post('/', authenticate, authorize('ADMIN'), validate(projectValidation), async (req, res) => {
  try {
const project = await prisma.project.create({
       data: req.body
     });

    await logActivity(req.user.id, 'CREATE_PROJECT', { project_id: project.project_id, name: project.name }, req);

     res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:project_id (Admin only)
router.put('/:project_id', authenticate, authorize('ADMIN'), validate(projectValidation), async (req, res) => {
  try {
const project = await prisma.project.update({
       where: { project_id: parseInt(req.params.project_id) },
       data: req.body
     });

    await logActivity(req.user.id, 'UPDATE_PROJECT', { project_id: project.project_id, name: project.name }, req);

     res.json({ message: 'Project updated', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:project_id (Admin only) - move to archives
router.delete('/:project_id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { project_id: parseInt(req.params.project_id) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { project_id, ...projectData } = project;
    await prisma.archive.create({
      data: {
        title: project.name,
        description: `Project record archived`,
        category: 'PROJECT',
        entity_type: 'PROJECT',
        entity_id: project_id,
        entity_data: projectData,
        archived_by: req.user.id
      }
    });

    await prisma.project.delete({
      where: { project_id: parseInt(req.params.project_id) }
    });

    await logActivity(req.user.id, 'DELETE_PROJECT', { project_id: project.project_id, name: project.name }, req);

    res.json({ message: 'Project moved to archives' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/stats
router.get('/stats', async (req, res) => {
  try {
    const active = await prisma.project.count({ where: { status: 'ACTIVE' } });
    const planning = await prisma.project.count({ where: { status: 'PLANNING' } });
    const completed = await prisma.project.count({ where: { status: 'COMPLETED' } });
    res.json({ active, planning, completed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
