import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const uploadMany = multer({ storage });

// ============================================================
// GET /api/documents (list requests)
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, user_id, resident_id } = req.query;

    let where = {};
    if (status) where.status = status;

    // Accept both new user_id and backward-compat resident_id query params
    if (user_id) {
      where.user_id = parseInt(user_id);
    } else if (resident_id) {
      const residentUser = await prisma.resident.findUnique({
        where: { resident_id: parseInt(resident_id) },
        select: { user_id: true }
      });
      if (residentUser?.user_id) where.user_id = residentUser.user_id;
    }

     // Residents can only see their own requests
     if (req.user.role === 'RESIDENT') {
       where.user_id = req.user.id;
     }

     const requests = await prisma.documentRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, username: true } },
        attachments: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ============================================================
// GET /api/documents/:id
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const request = await prisma.documentRequest.findUnique({
      where: { document_request_id: parseInt(req.params.id) },
      include: {
        user: { select: { fullName: true, username: true } },
        attachments: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

     // Residents can only view their own
     if (req.user.role === 'RESIDENT') {
       if (request.user_id !== req.user.id) {
         res.status(403).json({ error: 'Access denied' });
         return;
       }
     }

    res.json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// ============================================================
// POST /api/documents (create request with multiple files)
// ============================================================
router.post('/', authenticate, uploadMany.array('files', 10), async (req, res) => {
  try {
    const { type, purpose } = req.body;
    const files = req.files || [];

    const required = ['type', 'purpose'];
    for (const field of required) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    let userId;

     if (req.user.role === 'ADMIN') {
       userId = req.body.user_id || req.user.id;
     } else {
       userId = req.user.id;
     }

    const request = await prisma.documentRequest.create({
      data: {
        user_id: userId,
        type,
        purpose,
        file_path: files.length > 0 ? `/uploads/documents/${files[0].filename}` : null,
        ...(files.length > 0 && {
          attachments: {
            create: files.map(f => ({
              file_path: `/uploads/documents/${f.filename}`,
              file_name: f.originalname,
              is_admin: false
            }))
          }
        })
      },
      include: {
        user: { select: { fullName: true, username: true } },
        attachments: true
      }
    });

    res.status(201).json({ message: 'Request submitted', request });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create request', details: error.message });
  }
});

// ============================================================
// POST /api/documents/:id/upload  (admin adds 1+ attachments)
// ============================================================
router.post('/:id/upload', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    const requestId       = parseInt(req.params.id);
    const responseComment = req.body.response_comment || '';
    const rawStatus       = (req.body.status || '').trim().toUpperCase();
    const files           = req.files || [];

    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const validStatuses = ['PENDING','APPROVED','REJECTED','RELEASED','CANCELLED'];
    const newStatus = validStatuses.includes(rawStatus) ? rawStatus : 'APPROVED';

    const existing = await prisma.documentRequest.findUnique({
      where: { document_request_id: requestId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Persist attachment records + response_file (first file only)
    if (files.length > 0) {
      await prisma.documentRequestAttachment.createMany({
        data: files.map(f => ({
          document_request_id: requestId,
          file_path:   `/uploads/documents/${f.filename}`,
          file_name:   f.originalname,
          is_admin:    true
        }))
      });
    }

    // Update status + comment (+ optional response_file from first file)
    const updated = await prisma.documentRequest.update({
      where: { document_request_id: requestId },
      data: {
        status:            newStatus,
        response_file:     files.length > 0 ? `/uploads/documents/${files[0].filename}` : existing.response_file,
        response_comment:  responseComment || (files.length === 0 ? null : existing.response_comment),
        processed_at:      new Date()
      },
      include: {
        user: { select: { fullName: true, username: true } },
        attachments: { where: { is_deleted: false }, orderBy: { created_at: 'asc' } }
      }
    });

    res.status(201).json({ message: 'Response submitted', request: updated });
  } catch (error) {
    console.error('Admin upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process admin response',
      env:   process.env.NODE_ENV || 'development'
    });
  }
});

// ============================================================
// PUT /api/documents/:id/status (Status changes)
// ============================================================
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'RELEASED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const existing = await prisma.documentRequest.findUnique({
      where: { document_request_id: parseInt(req.params.id) },
      include: { user: { select: { fullName: true, username: true } } }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Residents can only cancel their own pending requests
    if (req.user.role === 'RESIDENT') {
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (status !== 'CANCELLED' || existing.status !== 'PENDING') {
        return res.status(400).json({ error: 'Residents can only cancel their own pending requests' });
      }
    }

    // Admins cannot edit requests already released or rejected
    if (req.user.role === 'ADMIN' && (existing.status === 'RELEASED' || existing.status === 'REJECTED')) {
      return res.status(400).json({ error: 'Cannot modify a resolved request' });
    }

    const updated = await prisma.documentRequest.update({
      where: { document_request_id: parseInt(req.params.id) },
      data: {
        status,
        notes,
        processed_at: new Date()
      },
      include: {
        user: { select: { fullName: true, username: true } },
        attachments: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    res.json({ message: 'Request updated', request: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ============================================================
// GET /api/documents/stats/all (Admin only)
// ============================================================
router.get('/stats/all', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const pending = await prisma.documentRequest.count({ where: { status: 'PENDING' } });
    const approved = await prisma.documentRequest.count({ where: { status: 'APPROVED' } });
    const released = await prisma.documentRequest.count({ where: { status: 'RELEASED' } });

    res.json({ pending, approved, released });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================
// DELETE /api/documents/:id/attachments/:attachId
// (Resident removes their own attachment)
// ============================================================
router.delete('/:id/attachments/:attachId', authenticate, async (req, res) => {
  try {
    const attachment = await prisma.documentRequestAttachment.findUnique({
      where: { document_request_attachment_id: parseInt(req.params.attachId) },
      include: { request: true }
    });

    if (!attachment || attachment.document_request_id !== parseInt(req.params.id)) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Only the request owner can remove
    if (req.user.role !== 'ADMIN') {
      if (attachment.request.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const fileOnDisk = path.join(
      process.cwd(),
      attachment.file_path.replace(/^\//, '')
    );
    if (fs.existsSync(fileOnDisk)) {
      fs.unlinkSync(fileOnDisk);
    }

    await prisma.documentRequestAttachment.update({
      where: { document_request_attachment_id: attachment.document_request_attachment_id },
      data: { is_deleted: true }
    });

    res.json({ message: 'Attachment removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove attachment' });
  }
});

// ============================================================
// DELETE /api/documents/:id/response-file
// (Admin removes the admin response/upload file)
// ============================================================
router.delete('/:id/response-file', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const request = await prisma.documentRequest.findUnique({
      where: { document_request_id: parseInt(req.params.id) }
    });

    if (!request || !request.response_file) {
      return res.status(404).json({ error: 'No response file attached' });
    }

    const fileOnDisk = path.join(
      process.cwd(),
      request.response_file.replace(/^\//, '')
    );
    if (fs.existsSync(fileOnDisk)) {
      fs.unlinkSync(fileOnDisk);
    }

    // Also remove admin attachment records
    await prisma.documentRequestAttachment.deleteMany({
      where: { document_request_id: request.document_request_id, is_admin: true }
    });

    await prisma.documentRequest.update({
      where: { document_request_id: request.document_request_id },
      data: { response_file: null }
    });

    res.json({ message: 'Response file removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove response file' });
  }
});

// ============================================================
// DELETE /api/documents/:id (Owner deletes own request + files)
// ============================================================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);

    const request = await prisma.documentRequest.findUnique({
      where: { document_request_id: requestId },
      include: { attachments: true }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Only the request owner can delete
    if (req.user.role !== 'ADMIN') {
      if (request.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Delete attachment files from disk
    for (const attach of request.files) {
      const fileOnDisk = path.join(
        process.cwd(),
        attach.file_path.replace(/^\//, '')
      );
      if (fs.existsSync(fileOnDisk)) {
        fs.unlinkSync(fileOnDisk);
      }
    }

    // Delete response file from disk
    if (request.response_file) {
      const respFileOnDisk = path.join(
        process.cwd(),
        request.response_file.replace(/^\//, '')
      );
      if (fs.existsSync(respFileOnDisk)) {
        fs.unlinkSync(respFileOnDisk);
      }
    }

    // Delete attachment records and the request itself
    await prisma.documentRequestAttachment.deleteMany({
      where: { document_request_id: requestId }
    });
    await prisma.documentRequest.delete({
      where: { document_request_id: requestId }
    });

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;
