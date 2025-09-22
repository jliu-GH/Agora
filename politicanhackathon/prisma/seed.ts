import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create sample members
  const members = [
    {
      id: 'A000000',
      firstName: 'John',
      lastName: 'Doe',
      chamber: 'house',
      state: 'CA',
      district: '01',
      party: 'D',
      dwNominate: 0.5,
    },
    {
      id: 'B000000',
      firstName: 'Jane',
      lastName: 'Smith',
      chamber: 'senate',
      state: 'TX',
      party: 'R',
      dwNominate: -0.3,
    },
    {
      id: 'C000000',
      firstName: 'Alex',
      lastName: 'Johnson',
      chamber: 'house',
      state: 'NY',
      district: '14',
      party: 'D',
      dwNominate: 0.7,
    },
    {
      id: 'D000000',
      firstName: 'Sarah',
      lastName: 'Williams',
      chamber: 'senate',
      state: 'FL',
      party: 'R',
      dwNominate: -0.4,
    },
    {
      id: 'E000000',
      firstName: 'Michael',
      lastName: 'Brown',
      chamber: 'house',
      state: 'IL',
      district: '05',
      party: 'D',
      dwNominate: 0.6,
    },
    {
      id: 'F000000',
      firstName: 'Lisa',
      lastName: 'Davis',
      chamber: 'senate',
      state: 'OH',
      party: 'R',
      dwNominate: -0.2,
    },
    {
      id: 'G000000',
      firstName: 'David',
      lastName: 'Wilson',
      chamber: 'house',
      state: 'WA',
      district: '07',
      party: 'D',
      dwNominate: 0.8,
    },
    {
      id: 'H000000',
      firstName: 'Maria',
      lastName: 'Garcia',
      chamber: 'senate',
      state: 'NV',
      party: 'D',
      dwNominate: 0.3,
    },
  ];

  for (const member of members) {
    await prisma.member.upsert({
      where: { id: member.id },
      update: member,
      create: member,
    });
  }

  // Create sample committees
  const committees = [
    { id: 'COMM001', name: 'House Committee on Energy and Commerce' },
    { id: 'COMM002', name: 'Senate Committee on Foreign Relations' },
    { id: 'COMM003', name: 'House Committee on Ways and Means' },
    { id: 'COMM004', name: 'Senate Committee on Judiciary' },
  ];

  for (const committee of committees) {
    await prisma.committee.upsert({
      where: { id: committee.id },
      update: {},
      create: committee,
    });
  }

  // Create committee memberships
  const committeeMemberships = [
    { id: 'COMM001-A000000', committeeId: 'COMM001', memberId: 'A000000', role: 'Member' },
    { id: 'COMM001-C000000', committeeId: 'COMM001', memberId: 'C000000', role: 'Member' },
    { id: 'COMM001-E000000', committeeId: 'COMM001', memberId: 'E000000', role: 'Member' },
    { id: 'COMM002-B000000', committeeId: 'COMM002', memberId: 'B000000', role: 'Member' },
    { id: 'COMM002-D000000', committeeId: 'COMM002', memberId: 'D000000', role: 'Member' },
    { id: 'COMM002-F000000', committeeId: 'COMM002', memberId: 'F000000', role: 'Member' },
    { id: 'COMM003-G000000', committeeId: 'COMM003', memberId: 'G000000', role: 'Member' },
    { id: 'COMM004-H000000', committeeId: 'COMM004', memberId: 'H000000', role: 'Member' },
  ];

  for (const membership of committeeMemberships) {
    await prisma.committeeMember.upsert({
      where: { id: membership.id },
      update: {},
      create: membership,
    });
  }

  // Create sample bill
  const bill = await prisma.bill.upsert({
    where: { id: 'hr123-118' },
    update: {},
    create: {
      id: 'hr123-118',
      congress: 118,
      chamber: 'house',
      title: 'Sample Infrastructure Bill',
      summary: 'A bill to improve infrastructure across the United States',
      status: 'introduced',
      sponsorId: 'A000000',
    },
  });

  // Create sample bill action
  await prisma.billAction.upsert({
    where: { id: 'action001' },
    update: {},
    create: {
      id: 'action001',
      billId: 'hr123-118',
      date: new Date('2024-01-15'),
      chamber: 'house',
      stage: 'introduced',
      text: 'Introduced in House',
      sourceUrl: 'https://congress.gov/bill/118th-congress/house-bill/123',
    },
  });

  // Create sample crime metric
  await prisma.crimeMetric.upsert({
    where: { id: 'crime-ca-2023' },
    update: {},
    create: {
      id: 'crime-ca-2023',
      state: 'CA',
      year: 2023,
      violentRate: 4.2,
      propertyRate: 21.5,
      firearmDeathsPer100k: 8.1,
      notes: 'Data from FBI CDE',
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
