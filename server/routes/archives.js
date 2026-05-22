import express from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/archives - Get all archived entries (Admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const archives = await prisma.archive.findMany({
      orderBy: { created_at: 'desc' }
    });

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
    const archive = await prisma.archive.findUnique({
      where: { archive_id: parseInt(id) }
    });

    if (!archive) {
      return res.status(404).json({ error: 'Archive entry not found' });
    }

    const { entity_type, entity_data } = archive;

      await prisma.$transaction(async (tx) => {
        // Restore based on entity type
        switch (entity_type) {
           case 'RESIDENT': {
             const { linked_user_id, linked_official_id, user_id, ...residentDataWithoutUserId } = entity_data;
             const residentData = { ...residentDataWithoutUserId };
             
             // Restore user if exists - check if user already exists first
             let user = null;
             if (linked_user_id) {
               user = await tx.user.findUnique({
                 where: { user_id: linked_user_id }
               });
               
               if (!user) {
                 user = await tx.user.create({
                   data: {
                     user_id: linked_user_id,
                     username: `restored_user_${linked_user_id}`,
                     password: '',
                     fullName: residentData.full_name,
                     role: 'RESIDENT'
                   }
                 });
               }
               
               // Update resident with correct user_id
               residentData.user_id = user.user_id;
             }
             
             // Check if resident already exists with this user_id to avoid unique constraint violation
             if (linked_user_id) {
               const existingResident = await tx.resident.findFirst({
                 where: { user_id: linked_user_id }
               });
               if (existingResident) {
                 // If resident already exists, update it instead of creating new one
                 await tx.resident.update({
                   where: { resident_id: existingResident.resident_id },
                   data: residentData
                 });
               } else {
                 await tx.resident.create({ data: residentData });
               }
             } else {
               await tx.resident.create({ data: residentData });
             }
             
             // Restore linked official if exists
             if (linked_official_id) {
               const linkedOfficialEntry = await tx.archive.findFirst({
                 where: { entity_type: 'OFFICIAL', entity_id: linked_official_id }
               });
               if (linkedOfficialEntry) {
                 const { entity_data: officialData } = linkedOfficialEntry;
                 await tx.official.create({ data: officialData });
               }
             }
             break;
           }
        case 'PROJECT':
          await tx.project.create({ data: entity_data });
          break;
        case 'SESSION':
          await tx.session.create({ data: entity_data });
          break;
           case 'OFFICIAL': {
             const { linked_user_id, linked_resident_id, ...officialData } = entity_data;
             
             // Restore user if exists - check if user already exists first
             let user = null;
             if (linked_user_id) {
               user = await tx.user.findUnique({
                 where: { user_id: linked_user_id }
               });
               
               if (!user) {
                 user = await tx.user.create({
                   data: {
                     user_id: linked_user_id,
                     username: `restored_user_${linked_user_id}`,
                     password: '',
                     fullName: officialData.name,
                     role: 'OFFICIAL'
                   }
                 });
               }
               
               // Update official with correct name matching user
               officialData.name = user.fullName;
             }
             
             // Check if official already exists with this name to avoid conflicts
             if (linked_user_id) {
               // For officials, we check by name since they don't have direct user_id link
               const existingOfficial = await tx.official.findFirst({
                 where: { name: officialData.name }
               });
               if (existingOfficial) {
                 // If official already exists with this name, update it instead of creating new one
                 await tx.official.update({
                   where: { official_id: existingOfficial.official_id },
                   data: officialData
                 });
               } else {
                 await tx.official.create({ data: officialData });
               }
             } else {
               await tx.official.create({ data: officialData });
             }
             
             // Restore linked resident if exists
             if (linked_resident_id) {
               const linkedResidentEntry = await tx.archive.findFirst({
                 where: { entity_type: 'RESIDENT', entity_id: linked_resident_id }
               });
               if (linkedResidentEntry) {
                 const { entity_data: residentData } = linkedResidentEntry;
                 await tx.resident.create({ data: residentData });
               }
             }
             break;
           }
        case 'DOCUMENT_REQUEST':
          await tx.documentRequest.create({ data: entity_data });
          break;
        case 'ANNOUNCEMENT':
          await tx.announcement.create({ data: entity_data });
          break;
        default:
          return res.status(400).json({ error: `Unknown entity type: ${entity_type}` });
      }

      // Delete from archives after successful restore
      await tx.archive.delete({ where: { archive_id: parseInt(id) } });
    });

    res.json({ message: `${entity_type.toLowerCase()} restored successfully` });
  } catch (error) {
    console.error('Failed to restore entry:', error);
    res.status(500).json({ error: 'Failed to restore entry' });
  }
});

// DELETE /api/archives/:id/permanent - Permanently delete from archive (Admin only)
router.delete('/:id/permanent', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const archive = await prisma.archive.findUnique({
      where: { archive_id: parseInt(id) }
    });

    if (!archive) {
      return res.status(404).json({ error: 'Archive entry not found' });
    }

     await prisma.$transaction(async (tx) => {
       const { entity_data } = archive;
       
       // If this is a RESIDENT or OFFICIAL with linked_user_id, also delete the user
       if (archive.entity_type === 'RESIDENT' || archive.entity_type === 'OFFICIAL') {
         const linkedUserId = entity_data?.linked_user_id;
         if (linkedUserId) {
           // Delete user only if it exists
           const userExists = await tx.user.findUnique({
             where: { user_id: linkedUserId }
           });
           if (userExists) {
             await tx.user.delete({
               where: { user_id: linkedUserId }
             });
           }
         }
       }

       await tx.archive.delete({
         where: { archive_id: parseInt(id) }
       });
     });

    res.json({ message: 'Entry permanently deleted' });
  } catch (error) {
    console.error('Failed to permanently delete entry:', error);
    res.status(500).json({ error: 'Failed to permanently delete entry' });
  }
});

export default router;