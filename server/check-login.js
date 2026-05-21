import prisma from './prisma.js';
import bcrypt from 'bcryptjs';

try {
  const user = await prisma.user.findUnique({
    where: { username: 'resident' },
    include: { resident: true }
  });

  console.log('Found user:', user ? `${user.username} (${user.role})` : 'NO USER FOUND');
  if (!user) {
    console.error('PRISMA FAIL: user not found by username "resident"');
  } else {
    const valid = await bcrypt.compare('resident123', user.password);
    console.log(`prisma returned password: ${user.password?.substring(0,25)}...`);
    console.log(`bcrypt.compare('resident123', prisma password): ${valid}`);
  }
} finally {
  await prisma.$disconnect();
}
