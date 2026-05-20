import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const [users, residents] = await Promise.all([
    p.user.count(),
    p.resident.count()
  ]);
  console.log(`users: ${users}  residents: ${residents}`);
  const all = await p.user.findMany({ select:{ id:true, username:true, fullName:true, role:true, email:true, profilePicture:true } });
  for (const u of all) console.log(`  ${u.username} | role=${u.role} | email=${u.email ?? '-'} | pic=${u.profilePicture ?? '-'} `);
  if (residents > 0) {
    const r = await p.resident.findFirst({ include:{ user:{ select:{ username:true } } } });
    console.log('\nResident record:', { name:r.full_name, user:r.user?.username, age:r.age, gender:r.gender, birthday:!!r.birthday, address:r.address, status:r.status });
  }
}
main().catch(console.error).finally(()=>p.$disconnect());
