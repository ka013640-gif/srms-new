import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const cnt = await p.documentRequest.count({ where: {} });
  console.log('document_requests:', cnt);
}
main()
  .catch(console.error)
  .finally(() => p.$disconnect());
