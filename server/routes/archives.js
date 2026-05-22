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
       // Helper to restore user if needed
       const restoreUserIfNeeded = async (linkedUserId, defaultName, userData) => {
         if (!linkedUserId) return null;
         let user = await tx.user.findUnique({
           where: { user_id: linkedUserId }
         });
         if (!user) {
           // If we have archived user data, use it
           if (userData) {
             user = await tx.user.create({
               data: {
                 user_id: linkedUserId,
                 username: userData.username,
                 password: userData.password,
                 fullName: userData.fullName,
                 role: userData.role,
                 email: userData.email
               }
             });
           } else {
             // Fallback to default behavior
             user = await tx.user.create({
               data: {
                 user_id: linkedUserId,
                 username: `restored_user_${linkedUserId}`,
                 password: '',
                 fullName: defaultName || 'Restored User',
                 role: 'RESIDENT'
               }
             });
           }
         }
         return user;
       };

        // Helper to clean entity data - removes linked_* fields and timestamps
        const cleanEntityData = (data, includeUserId = false) => {
          const cleaned = { ...data };
          delete cleaned.linked_user_id;
          delete cleaned.linked_official_id;
          delete cleaned.linked_resident_id;
          delete cleaned.user_id;
          delete cleaned.created_at;
          delete cleaned.updated_at;
          delete cleaned.deleted_at;
          delete cleaned.user_data; // Remove user_data as it's only for archival/internal use
          if (includeUserId) cleaned.user_id = undefined;
          return cleaned;
        };

        // Restore based on entity type
        switch (entity_type) {
             case 'RESIDENT': {
               const { linked_user_id, linked_official_id, ...residentData } = entity_data;
               
               // Extract user_data if present (for user restoration only)
               const userData = residentData?.user_data;
               
               // Restore user first
               const user = await restoreUserIfNeeded(linked_user_id, residentData.full_name, userData);

               // Clean resident data (remove user_data as it's handled separately)
               const residentClean = cleanEntityData(residentData);

               // Restore resident
               const existingResident = await tx.resident.findFirst({
                 where: { user_id: user?.user_id }
               });
               const restoredResident = existingResident
                 ? await tx.resident.update({ where: { resident_id: existingResident.resident_id }, data: residentClean })
                 : await tx.resident.create({ data: { ...residentClean, user_id: user?.user_id } });

               // Restore linked official if exists - look up by entity_id (original official_id)
               if (linked_official_id) {
                 const linkedOfficialEntry = await tx.archive.findFirst({
                   where: { entity_type: 'OFFICIAL', entity_id: linked_official_id }
                 });
                 if (linkedOfficialEntry) {
                   const { entity_data: officialData } = linkedOfficialEntry;
                   const officialClean = cleanEntityData(officialData);

                   const existingOfficial = await tx.official.findFirst({
                     where: { user_id: user?.user_id }
                   });
                   if (existingOfficial) {
                     await tx.official.update({ where: { official_id: existingOfficial.official_id }, data: officialClean });
                   } else {
                     await tx.official.create({ data: { ...officialClean, user_id: user?.user_id } });
                   }
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
               
               // Extract user_data if present (for user restoration only)
               const userData = officialData?.user_data;
               
               // Restore user first
               const user = await restoreUserIfNeeded(linked_user_id, officialData.name, userData);

               // Clean official data
               const officialClean = cleanEntityData(officialData);

               // Restore official
               const existingOfficial = await tx.official.findFirst({
                 where: { user_id: user?.user_id }
               });
               const restoredOfficial = existingOfficial
                 ? await tx.official.update({ where: { official_id: existingOfficial.official_id }, data: officialClean })
                 : await tx.official.create({ data: { ...officialClean, user_id: user?.user_id } });

               // Restore linked resident if exists - look up by entity_id (original resident_id)
               if (linked_resident_id) {
                 const linkedResidentEntry = await tx.archive.findFirst({
                   where: { entity_type: 'RESIDENT', entity_id: linked_resident_id }
                 });
                 if (linkedResidentEntry) {
                   const { entity_data: residentData } = linkedResidentEntry;
                   const residentClean = cleanEntityData(residentData);

                   const existingResident = await tx.resident.findFirst({
                     where: { user_id: user?.user_id }
                   });
                   if (existingResident) {
                     await tx.resident.update({ where: { resident_id: existingResident.resident_id }, data: residentClean });
                   } else {
                     await tx.resident.create({ data: { ...residentClean, user_id: user?.user_id } });
                   }
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
    res.status(500).json({ error: 'Failed to restore entry', details: error.message });
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
        
        // If this is a RESIDENT or OFFICIAL, also delete the user if it exists in archive
        if (archive.entity_type === 'RESIDENT' || archive.entity_type === 'OFFICIAL') {
          const linkedUserId = entity_data?.linked_user_id;
          const userData = entity_data?.user_data;
          
          // Delete user if we have archived user data (indicating it was archived with the record)
          if (linkedUserId && userData) {
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
          // Fallback: delete user by linked_user_id if no user_data (existing behavior)
          else if (linkedUserId) {
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