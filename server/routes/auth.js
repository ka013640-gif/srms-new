import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { validate, loginValidation, registerValidation, createAccountValidation } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from './activity.js';

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

    // Role validation: selected role must match account's actual role
    if (!user.role) {
      res.status(401).json({ error: 'Account has no role assigned. Contact administrator.' });
      return;
    }

    if (role && role.toUpperCase() !== user.role) {
      res.status(401).json({ error: `This account is registered as ${user.role.toLowerCase()}. Please select the correct role.` });
      return;
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
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/create-account — creates User + Resident (+ Official) atomically
router.post('/create-account', authenticate, authorize('ADMIN'), validate(createAccountValidation), async (req, res) => {
  try {
    const { accountType } = req.body;
    const { username, password, fullname, email, position, term_start, term_end } = req.body;
    const age = calculateAge(req.body.birthday);

    // Check username uniqueness
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check email uniqueness (when provided)
    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email: email.trim() } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user account (RESIDENT or OFFICIAL role based on accountType)
      const user = await tx.user.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
          fullName: fullname.trim(),
          role: accountType === 'official' ? 'OFFICIAL' : 'RESIDENT',
          email: email?.trim() || null
        },
        select: {
          user_id: true,
          username: true,
          fullName: true,
          role: true,
          email: true,
          created_at: true
        }
      });

      // 2. Create resident profile linked to the new user
      const isBirthdayDate = (d) => !isNaN(Date.parse(d));

      const residentData = await tx.resident.create({
        data: {
          user_id: user.user_id,
          full_name: fullname.trim(),
          age: age,
          gender: req.body.gender,
          birthday: isBirthdayDate(req.body.birthday) ? new Date(req.body.birthday) : null,
          address: req.body.address.trim(),
          contact: req.body.contact?.trim() || null,
          occupation: accountType === 'official' ? 'Barangay Official' : (req.body.occupation?.trim() || null),
          civil_status: req.body.civil_status,
          status: 'Active'
        },
        select: {
          resident_id: true,
          full_name: true,
          birthday: true,
          age: true,
          gender: true,
          address: true,
          contact: true,
          occupation: true,
          civil_status: true,
          status: true,
          created_at: true
        }
      });

      // 3. Optionally create official record
      let official = null;
      if (accountType === 'official' && position && position.trim()) {
        const startDate = isBirthdayDate(term_start) ? new Date(term_start) : now;
        const endDate = isBirthdayDate(term_end) ? new Date(term_end) : null;

        official = await tx.official.create({
          data: {
            name: fullname.trim(),
            position: position.trim(),
            contact: req.body.contact?.trim() || null,
            term_start: startDate,
            term_end: endDate,
            is_active: true
          },
          select: {
            official_id: true,
            name: true,
            position: true,
            contact: true,
            term_start: true,
            term_end: true,
            is_active: true,
            created_at: true
          }
        });
      }

      return { user, resident: residentData, official };
    });

    // Log activity after transaction completes successfully
    await logActivity(result.user.user_id, 'CREATE_ACCOUNT',
      { full_name: result.resident.full_name, accountType }, req);

    res.status(201).json({
      message: accountType === 'official' ? 'Official account created successfully' : 'Account created successfully',
      user: result.user,
      resident: result.resident,
      official: result.official
    });
  } catch (error) {
    console.error('Create account error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A record with this value already exists' });
    }
    res.status(500).json({ error: 'Failed to create account', details: error.message });
  }
});

    // GET /api/auth/me — full profile (user +resident + optional official), any authenticated user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.id },
      select: {
        user_id: true, username: true, fullName: true,
        role: true, email: true, created_at: true,
        resident: {
          select: {
            resident_id: true, full_name: true, birthday: true,
            age: true, gender: true, address: true, contact: true,
            occupation: true, civil_status: true, status: true
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let response = { user };
    if (user.role === 'OFFICIAL') {
      // Tagged-template $executeRaw with ${} embeds Prisma auto-parameterisation.
      const official = await prisma.$executeRaw`
        SELECT official_id, name, position, contact, term_start, term_end,
               is_active, created_at
        FROM officials
        WHERE LOWER(name) = LOWER(${user.fullName})
          AND deleted_at IS NULL
        LIMIT 1
      `;
      response.official = official[0] || null;
    }

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── helpers ──

function calculateAge(birthday) {
  if (!birthday || !isISO8601(birthday)) return 0;
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function isISO8601(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}/.test(str);
}

export default router;