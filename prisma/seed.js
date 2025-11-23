const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const admin = await prisma.admin.upsert({
    where: { username: process.env.ADMIN_USERNAME || 'admin' },
    update: {},
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash: hashedPassword,
    },
  });
  console.log(`✅ Created admin user: ${admin.username}`);

  // Create 3 main bosses
  const bosses = [
    { name: 'John Tan', phoneNumber: '+60123456789' },
    { name: 'Mary Lim', phoneNumber: '+60198765432' },
    { name: 'David Wong', phoneNumber: '+60187654321' },
  ];

  for (const bossData of bosses) {
    const boss = await prisma.boss.upsert({
      where: { id: bosses.indexOf(bossData) + 1 },
      update: bossData,
      create: bossData,
    });
    console.log(`✅ Created boss: ${boss.name} (${boss.phoneNumber})`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
