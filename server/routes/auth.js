import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { validate, loginValidation, registerValidation } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.user_id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', validate(registerValidation), async (req, res) => {
  try {
    const { fullname, username, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User account only — no resident profile is auto-created.
    // Users and residents are decoupled: a user account is independent of the
    // Resident model. Admins must add residents separately via the Residents page.
    const user = await prisma.user.create({
      data: {
        fullName: fullname,
        username,
        password: hashedPassword,
        role: 'RESIDENT'
      },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        role: true,
        resident: {
          select: { resident_id: true, full_name: true, age: true, gender: true, address: true }
        }
      }
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        user_id: user.user_id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        resident: user.resident
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginValidation), async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        resident: true
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Role validation (informational only - doesn't block login)
    // If role is provided, just log it for reference
    if (role) {
      console.log(`User ${username} logging in with role: ${role}, actual role: ${user.role}`);
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me (get current user)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.id },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        profilePicture: true,
        resident: {
          select: { resident_id: true, full_name: true, birthday: true, age: true,
            gender: true, address: true, contact: true, occupation: true, civil_status: true }
        }
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;