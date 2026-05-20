import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPw = await bcrypt.hash('admin123', 10);
  const residentPw = await bcrypt.hash('12345678', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { fullName: 'System Administrator' },
    create: { fullName: 'System Administrator', username: 'admin', password: adminPw, role: 'ADMIN' }
  });
  console.log('Admin user: admin / admin123');

  await prisma.user.upsert({
    where: { username: 'resident' },
    update: {},
    create: { fullName: 'Default Resident', username: 'resident', password: residentPw, role: 'RESIDENT' }
  });
  console.log('Resident user: resident / 12345678');

  const residents = [];

  const born2000 = [
    { id: '001', age: 26, gender: 'Male', status: 'Inactive' },
    { id: '002', age: 26, gender: 'Male', status: 'Active' },
    { id: '003', age: 26, gender: 'Male', status: 'Active' },
    { id: '004', age: 26, gender: 'Male', status: 'Active' },
    { id: '005', age: 26, gender: 'Male', status: 'Active' },
    { id: '006', age: 26, gender: 'Male', status: 'Active' },
    { id: '007', age: 26, gender: 'Male', status: 'Active' },
    { id: '008', age: 26, gender: 'Female', status: 'Inactive' },
    { id: '009', age: 26, gender: 'Female', status: 'Active' },
    { id: '010', age: 26, gender: 'Female', status: 'Active' },
    { id: '011', age: 26, gender: 'Female', status: 'Active' },
    { id: '012', age: 26, gender: 'Female', status: 'Active' },
  ];

  const born1960 = [
    { id: '013', age: 66, gender: 'Male', status: 'Active' },
    { id: '014', age: 66, gender: 'Male', status: 'Active' },
    { id: '015', age: 66, gender: 'Male', status: 'Active' },
    { id: '016', age: 66, gender: 'Male', status: 'Active' },
    { id: '017', age: 66, gender: 'Female', status: 'Active' },
    { id: '018', age: 66, gender: 'Female', status: 'Active' },
  ];

  const born2010 = [
    { id: '019', age: 16, gender: 'Male', status: 'Active' },
    { id: '020', age: 16, gender: 'Female', status: 'Active' },
  ];

  for (const r of [...born2000, ...born1960, ...born2010]) {
    const birthday = r.age === 26 ? new Date('2000-01-01') : r.age === 66 ? new Date('1960-01-01') : new Date('2010-01-01');
    residents.push({ full_name: r.id, age: r.age, gender: r.gender, address: 'Calabanga, Camarines Sur', birthday, civil_status: '', occupation: '', status: r.status });
  }

  await prisma.resident.deleteMany({});
  
  for (const r of residents) {
    await prisma.resident.create({
      data: r
    });
  }
  console.log('Created 20 sample residents');

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(async () => { await prisma.$disconnect(); });

