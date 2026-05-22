import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

async function seedDatabase() {
  const conn = await pool.getConnection();
  try {
    console.log('Starting database seeding...');

    // Hash password for default users
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // 1. Seed Users table
    const [usersCount] = await conn.query('SELECT COUNT(*) as cnt FROM users');
    console.log(`Users: ${usersCount[0].cnt} rows`);

    // Create admin user if not exists
    const [adminCheck] = await conn.query("SELECT user_id FROM users WHERE username = 'admin'");
    if (adminCheck.length === 0) {
      await conn.query(`
        INSERT INTO users (username, password, fullName, role, email)
        VALUES (?, ?, ?, 'ADMIN', ?)
      `, ['admin', hashedPassword, 'System Administrator', 'admin@barangay.gov.ph']);
      console.log('Admin user created.');
    }

    // Create official user if not exists
    const [officialCheck] = await conn.query("SELECT user_id FROM users WHERE username = 'official'");
    if (officialCheck.length === 0) {
      await conn.query(`
        INSERT INTO users (username, password, fullName, role, email)
        VALUES (?, ?, ?, 'OFFICIAL', ?)
      `, ['official', hashedPassword, 'Barangay Official', 'official@barangay.gov.ph']);
      console.log('Official user created.');
    }

    // Create resident users if not exist (40 residents)
    const [residentCheck] = await conn.query("SELECT COUNT(*) as cnt FROM users WHERE role = 'RESIDENT'");
    if (residentCheck[0].cnt === 0) {
      let maleCount = 0, femaleCount = 0;
      
      for (let i = 1; i <= 40; i++) {
        const name = i.toString().padStart(4, '0');
        const email = `residentemail${name}@gmail.com`;
        const gender = maleCount < 24 ? 'Male' : 'Female';
        if (gender === 'Male') maleCount++; else femaleCount++;

        await conn.query(`
          INSERT INTO users (username, password, fullName, role, email)
          VALUES (?, ?, ?, 'RESIDENT', ?)
        `, [name, hashedPassword, name, email]);
      }
      console.log('40 resident users created.');
    }

    // 2. Seed Residents table
    const [residentsCount] = await conn.query('SELECT COUNT(*) as cnt FROM residents');
    if (residentsCount[0].cnt === 0) {
      // Get all resident user_ids
      const [residentUsers] = await conn.query("SELECT user_id, username FROM users WHERE role = 'RESIDENT' ORDER BY username");

      // Create distribution arrays for age and gender
      const ages = [];
      for (let i = 0; i < 20; i++) ages.push({ birthday: '2000-01-01', age: 26 }); // adults
      for (let i = 0; i < 12; i++) ages.push({ birthday: '2010-01-01', age: 16 });  // children
      for (let i = 0; i < 8; i++) ages.push({ birthday: '1960-01-01', age: 66 });   // seniors
      
      // Shuffle ages
      for (let i = ages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ages[i], ages[j]] = [ages[j], ages[i]];
      }

      const genders = [];
      for (let i = 0; i < 24; i++) genders.push('Male');
      for (let i = 0; i < 16; i++) genders.push('Female');
      
      // Shuffle genders
      for (let i = genders.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [genders[i], genders[j]] = [genders[j], genders[i]];
      }

      // Insert resident profiles
      for (let i = 0; i < residentUsers.length; i++) {
        const { user_id, username } = residentUsers[i];
        const { birthday, age } = ages[i];
        const gender = genders[i];
        const contact = `090000000${(i + 1).toString().padStart(2, '0')}`;

        await conn.query(`
          INSERT INTO residents (user_id, full_name, age, gender, birthday, address, contact, occupation, civil_status, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, username, age, gender, birthday, 'Calabanga, Camarines Sur', contact, 'occupation', 'Single', 'Active']);
      }
      console.log('Resident profiles seeded.');
    }

    // 3. Seed Officials table
    const [officialsCount] = await conn.query('SELECT COUNT(*) as cnt FROM officials');
    if (officialsCount[0].cnt === 0) {
      // Get official user
      const [officialUser] = await conn.query("SELECT user_id FROM users WHERE username = 'official'");
      
      if (officialUser.length > 0) {
        const user_id = officialUser[0].user_id;
        
        await conn.query(`
          INSERT INTO officials (user_id, name, position, contact, term_start, term_end, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [user_id, 'Barangay Official', 'Barangay Captain', '09123456789', '2023-01-01', '2025-12-31', true]);
        
        console.log('Official profile seeded.');
      }
    }

    // 4. Seed Projects table
    const [projectsCount] = await conn.query('SELECT COUNT(*) as cnt FROM projects');
    if (projectsCount[0].cnt === 0) {
      const projectData = [
        { name: 'Barangay Hall Rehabilitation', description: 'Renovation of the barangay hall facility', status: 'ACTIVE', budget: 500000, start_date: '2023-01-15', end_date: '2023-12-31' },
        { name: 'Street Lighting Project', description: 'Installation of solar-powered street lights', status: 'PLANNING', budget: 300000, start_date: '2024-03-01', end_date: '2024-09-30' },
        { name: 'Water System Upgrade', description: 'Improvement of potable water distribution system', status: 'COMPLETED', budget: 750000, start_date: '2022-06-01', end_date: '2023-05-30' },
        { name: 'Health Center Construction', description: 'Building a new barangay health center', status: 'CANCELLED', budget: 1000000, start_date: null, end_date: null }
      ];

      for (const project of projectData) {
        await conn.query(`
          INSERT INTO projects (name, description, status, budget, start_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [project.name, project.description, project.status, project.budget, project.start_date, project.end_date]);
      }
      console.log('Projects seeded.');
    }

    // 5. Seed Sessions table
    const [sessionsCount] = await conn.query('SELECT COUNT(*) as cnt FROM sessions');
    if (sessionsCount[0].cnt === 0) {
      const sessionData = [
        { title: 'Barangay Assembly', description: 'Quarterly barangay assembly meeting', date: '2023-03-15', time: '09:00:00', location: 'Barangay Hall', status: 'COMPLETED' },
        { title: 'Peace and Order Council Meeting', description: 'Monthly peace and order council meeting', date: '2023-06-20', time: '10:00:00', location: 'Barangay Hall', status: 'SCHEDULED' },
        { title: 'Disaster Preparedness Seminar', description: 'Seminar on disaster preparedness and response', date: '2023-09-10', time: '08:00:00', location: 'Barangay Covered Court', status: 'SCHEDULED' },
        { title: 'Health and Wellness Program', description: 'Monthly health and wellness activities for residents', date: '2023-12-05', time: '14:00:00', location: 'Barangay Plaza', status: 'PLANNING' }
      ];

      for (const session of sessionData) {
        await conn.query(`
          INSERT INTO sessions (title, description, date, time, location, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [session.title, session.description, session.date, session.time, session.location, session.status]);
      }
      console.log('Sessions seeded.');
    }

    // 6. Seed Document Requests table
    const [docRequestsCount] = await conn.query('SELECT COUNT(*) as cnt FROM document_requests');
    if (docRequestsCount[0].cnt === 0) {
      // Get some resident user IDs for document requests
      const [residentUsers] = await conn.query("SELECT user_id FROM users WHERE role = 'RESIDENT' LIMIT 5");
      
      const docTypes = ['Barangay Clearance', 'Indigency Certificate', 'Residency Certificate', 'Business Permit', 'Building Permit'];
      const purposes = ['For employment', 'For travel', 'For school enrollment', 'For loan application', 'For business registration'];
      
      for (let i = 0; i < 5; i++) {
        const user_id = residentUsers[i]?.user_id || 2; // Fallback to first resident
        const type = docTypes[i];
        const purpose = purposes[i];
        const status = i % 3 === 0 ? 'PENDING' : (i % 3 === 1 ? 'APPROVED' : 'RELEASED');
        
        await conn.query(`
          INSERT INTO document_requests (user_id, type, purpose, request_date, status)
          VALUES (?, ?, ?, ?, ?)
        `, [user_id, type, purpose, new Date().toISOString().slice(0, 19).replace('T', ' '), status]);
      }
      
      // Add some processed documents
      for (let i = 0; i < 3; i++) {
        const user_id = residentUsers[i]?.user_id || 2;
        const type = docTypes[i];
        const purpose = purposes[i];
        const status = 'RELEASED';
        
        await conn.query(`
          INSERT INTO document_requests (user_id, type, purpose, request_date, status, processed_by, processed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [user_id, type, purpose, new Date().toISOString().slice(0, 19).replace('T', ' '), status, 1, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
      }
      
      console.log('Document requests seeded.');
    }

    // 7. Seed Document Request Attachments
    const [attachmentsCount] = await conn.query('SELECT COUNT(*) as cnt FROM document_request_attachments');
    if (attachmentsCount[0].cnt === 0) {
      // Get some document request IDs
      const [docRequests] = await conn.query('SELECT document_request_id FROM document_requests LIMIT 3');
      
      for (let i = 0; i < docRequests.length; i++) {
        const docRequestId = docRequests[i].document_request_id;
        
        await conn.query(`
          INSERT INTO document_request_attachments (document_request_id, file_path, file_name, is_admin, is_deleted)
          VALUES (?, ?, ?, ?, ?)
        `, [docRequestId, `/uploads/documents/${docRequestId}_attachment1.pdf`, `attachment1.pdf`, false, false]);
        
        await conn.query(`
          INSERT INTO document_request_attachments (document_request_id, file_path, file_name, is_admin, is_deleted)
          VALUES (?, ?, ?, ?, ?)
        `, [docRequestId, `/uploads/documents/${docRequestId}_attachment2.pdf`, `attachment2.pdf`, true, false]);
      }
      
      console.log('Document request attachments seeded.');
    }

    // 8. Seed Activity Log
    const [activityLogCount] = await conn.query('SELECT COUNT(*) as cnt FROM activity_log');
    if (activityLogCount[0].cnt === 0) {
      // Get some user IDs
      const [users] = await conn.query('SELECT user_id FROM users LIMIT 3');
      
      const actions = ['USER_LOGIN', 'DOCUMENT_REQUEST_CREATED', 'PROFILE_UPDATED'];
      const details = ['User logged in successfully', 'Created barangay clearance request', 'Updated contact information'];
      
      for (let i = 0; i < 3; i++) {
        const user_id = users[i]?.user_id || 1;
        const action = actions[i];
        const detail = details[i];
        
        await conn.query(`
          INSERT INTO activity_log (user_id, action, details, ip_address)
          VALUES (?, ?, ?, ?)
        `, [user_id, action, detail, '192.168.1.100']);
      }
      
      console.log('Activity log seeded.');
    }

    // 9. Seed Announcements
    const [announcementsCount] = await conn.query('SELECT COUNT(*) as cnt FROM announcements');
    if (announcementsCount[0].cnt === 0) {
      // Get admin user ID
      const [adminUser] = await conn.query("SELECT user_id FROM users WHERE username = 'admin'");
      
      if (adminUser.length > 0) {
        const user_id = adminUser[0].user_id;
        
        const announcements = [
          { title: 'Barangay Fiesta 2023', content: 'The annual barangay fiesta will be held on December 15-16, 2023.' },
          { title: 'Water Interruption Notice', content: 'Please be advised of scheduled water maintenance on October 1-2, 2023.' },
          { title: 'COVID-19 Vaccination Drive', content: 'Free COVID-19 vaccination will be available at the barangay health center every Monday and Thursday.' }
        ];
        
        for (const announcement of announcements) {
          await conn.query(`
            INSERT INTO announcements (title, content, user_id)
            VALUES (?, ?, ?)
          `, [announcement.title, announcement.content, user_id]);
        }
        
        console.log('Announcements seeded.');
      }
    }

    // 10. Seed Archive
    const [archiveCount] = await conn.query('SELECT COUNT(*) as cnt FROM archives');
    if (archiveCount[0].cnt === 0) {
      // Get admin user ID
      const [adminUser] = await conn.query("SELECT user_id FROM users WHERE username = 'admin'");
      
      if (adminUser.length > 0) {
        const user_id = adminUser[0].user_id;
        
        const archives = [
          { title: '2022 Financial Report', description: 'Annual financial statement for 2022', category: 'Financial', entity_type: 'financial_report', entity_id: 1, entity_data: '{ \"year\": 2022, \"total_income\": 500000, \"total_expense\": 450000 }' },
          { title: 'Barangay Development Plan 2023-2025', description: 'Three-year development plan for the barangay', category: 'Planning', entity_type: 'development_plan', entity_id: 1, entity_data: '{ \"start_year\": 2023, \"end_year\": 2025, \"projects\": 5 }' },
          { title: 'Disaster Preparedness Manual', description: 'Manual for disaster preparedness and response procedures', category: 'Manual', entity_type: 'manual', entity_id: 1, entity_data: '{ \"pages\": 50, \"chapters\": 5, \"last_updated\": \"2023-01-15\" }' }
        ];
        
        for (const archive of archives) {
          await conn.query(`
            INSERT INTO archives (title, description, category, entity_type, entity_id, entity_data, file_path, archived_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [archive.title, archive.description, archive.category, archive.entity_type, archive.entity_id, archive.entity_data, null, user_id]);
        }
        
        console.log('Archive seeded.');
      }
    }

    // Final verification
    const [finalUsers] = await conn.query('SELECT user_id, username, fullName, role FROM users ORDER BY user_id');
    console.log('\nAll users:', JSON.stringify(finalUsers, null, 2));
    
    const [residentCount] = await conn.query('SELECT COUNT(*) as cnt FROM residents');
    console.log(`\nResident profiles: ${residentCount[0].cnt}`);
    
    const [officialCount] = await conn.query('SELECT COUNT(*) as cnt FROM officials');
    console.log(`Official profiles: ${officialCount[0].cnt}`);
    
    const [projectCount] = await conn.query('SELECT COUNT(*) as cnt FROM projects');
    console.log(`Projects: ${projectCount[0].cnt}`);
    
    const [sessionCount] = await conn.query('SELECT COUNT(*) as cnt FROM sessions');
    console.log(`Sessions: ${sessionCount[0].cnt}`);
    
    const [docRequestCount] = await conn.query('SELECT COUNT(*) as cnt FROM document_requests');
    console.log(`Document requests: ${docRequestCount[0].cnt}`);
    
    console.log('\nDatabase seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

// Execute the seeding function
seedDatabase().catch(console.error);