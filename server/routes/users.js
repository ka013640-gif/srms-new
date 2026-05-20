import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// GET /api/users/me (own profile – any authenticated user)
router.get('/me', authenticate, async (req, res) => {
  try {
     const user = await prisma.user.findUnique({
       where: { user_id: req.user.id },
       select: {
         user_id: true, username: true, fullName: true,
         role: true, email: true, profilePicture: true, created_at: true
       }
     });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile (edit own account – any authenticated user)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, email, password, profilePicture } = req.body;

    const data = {};
    if (fullName !== undefined)        data.fullName = fullName;
    if (email !== undefined)           data.email = email;
    if (profilePicture !== undefined)  data.profilePicture = profilePicture;
    if (password !== undefined && password.trim() !== '') {
      data.password = await bcryptjs.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { user_id: req.user.id },
      data,
      select: {
        user_id: true, username: true, fullName: true,
        role: true, email: true, profilePicture: true, created_at: true
      }
    });

    res.json({ message: 'Profile updated', user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// POST /api/profile/picture (upload profile picture)
router.post('/profile/picture', authenticate, upload.single('picture'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const pictureUrl = `/uploads/profiles/${req.file.filename}`;

    const updated = await prisma.user.update({
      where: { user_id: req.user.id },
      data: { profilePicture: pictureUrl },
      select: {
        user_id: true, username: true, fullName: true,
        role: true, email: true, profilePicture: true, created_at: true
      }
    });

    res.json({ message: 'Profile picture updated', user: updated });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// ============================================================
// GET /api/users (list all users) - Admin only
// ============================================================
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        user_id: true,
        username: true,
        fullName: true,
        role: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(req.params.id) },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        role: true,
        created_at: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
