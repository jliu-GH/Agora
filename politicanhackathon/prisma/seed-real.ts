import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real congressional data for 2024
const realMembers = [
  // California House Representatives (sample)
  { id: 'CAH01', firstName: 'Doug', lastName: 'LaMalfa', chamber: 'house', state: 'CA', district: '01', party: 'R' },
  { id: 'CAH02', firstName: 'Jared', lastName: 'Huffman', chamber: 'house', state: 'CA', district: '02', party: 'D' },
  { id: 'CAH03', firstName: 'Kevin', lastName: 'Kiley', chamber: 'house', state: 'CA', district: '03', party: 'R' },
  { id: 'CAH04', firstName: 'Mike', lastName: 'Thompson', chamber: 'house', state: 'CA', district: '04', party: 'D' },
  { id: 'CAH05', firstName: 'Tom', lastName: 'McClintock', chamber: 'house', state: 'CA', district: '05', party: 'R' },
  
  // California Senators
  { id: 'CAS1', firstName: 'Dianne', lastName: 'Feinstein', chamber: 'senate', state: 'CA', party: 'D' },
  { id: 'CAS2', firstName: 'Alex', lastName: 'Padilla', chamber: 'senate', state: 'CA', party: 'D' },
  
  // Texas House Representatives (sample)
  { id: 'TXH01', firstName: 'Nathaniel', lastName: 'Moran', chamber: 'house', state: 'TX', district: '01', party: 'R' },
  { id: 'TXH02', firstName: 'Dan', lastName: 'Crenshaw', chamber: 'house', state: 'TX', district: '02', party: 'R' },
  { id: 'TXH03', firstName: 'Keith', lastName: 'Self', chamber: 'house', state: 'TX', district: '03', party: 'R' },
  { id: 'TXH04', firstName: 'Pat', lastName: 'Fallon', chamber: 'house', state: 'TX', district: '04', party: 'R' },
  { id: 'TXH05', firstName: 'Lance', lastName: 'Gooden', chamber: 'house', state: 'TX', district: '05', party: 'R' },
  
  // Texas Senators
  { id: 'TXS1', firstName: 'John', lastName: 'Cornyn', chamber: 'senate', state: 'TX', party: 'R' },
  { id: 'TXS2', firstName: 'Ted', lastName: 'Cruz', chamber: 'senate', state: 'TX', party: 'R' },
  
  // New York House Representatives (sample)
  { id: 'NYH01', firstName: 'Nick', lastName: 'LaLota', chamber: 'house', state: 'NY', district: '01', party: 'R' },
  { id: 'NYH02', firstName: 'Andrew', lastName: 'Garbarino', chamber: 'house', state: 'NY', district: '02', party: 'R' },
  { id: 'NYH03', firstName: 'George', lastName: 'Santos', chamber: 'house', state: 'NY', district: '03', party: 'R' },
  { id: 'NYH04', firstName: 'Anthony', lastName: 'D\'Esposito', chamber: 'house', state: 'NY', district: '04', party: 'R' },
  { id: 'NYH05', firstName: 'Gregory', lastName: 'Meeks', chamber: 'house', state: 'NY', district: '05', party: 'D' },
  
  // New York Senators
  { id: 'NYS1', firstName: 'Kirsten', lastName: 'Gillibrand', chamber: 'senate', state: 'NY', party: 'D' },
  { id: 'NYS2', firstName: 'Chuck', lastName: 'Schumer', chamber: 'senate', state: 'NY', party: 'D' },
  
  // Florida House Representatives (sample)
  { id: 'FLH01', firstName: 'Matt', lastName: 'Gaetz', chamber: 'house', state: 'FL', district: '01', party: 'R' },
  { id: 'FLH02', firstName: 'Neal', lastName: 'Dunn', chamber: 'house', state: 'FL', district: '02', party: 'R' },
  { id: 'FLH03', firstName: 'Kat', lastName: 'Cammack', chamber: 'house', state: 'FL', district: '03', party: 'R' },
  { id: 'FLH04', firstName: 'Aaron', lastName: 'Bean', chamber: 'house', state: 'FL', district: '04', party: 'R' },
  { id: 'FLH05', firstName: 'John', lastName: 'Rutherford', chamber: 'house', state: 'FL', district: '05', party: 'R' },
  
  // Florida Senators
  { id: 'FLS1', firstName: 'Marco', lastName: 'Rubio', chamber: 'senate', state: 'FL', party: 'R' },
  { id: 'FLS2', firstName: 'Rick', lastName: 'Scott', chamber: 'senate', state: 'FL', party: 'R' },
  
  // Independent Senator (Bernie Sanders)
  { id: 'VTS1', firstName: 'Bernie', lastName: 'Sanders', chamber: 'senate', state: 'VT', party: 'I' },
  { id: 'VTS2', firstName: 'Peter', lastName: 'Welch', chamber: 'senate', state: 'VT', party: 'D' },
  
  // Independent House Member (Jared Golden)
  { id: 'MEH02', firstName: 'Jared', lastName: 'Golden', chamber: 'house', state: 'ME', district: '02', party: 'I' },
  { id: 'MEH01', firstName: 'Chellie', lastName: 'Pingree', chamber: 'house', state: 'ME', district: '01', party: 'D' },
];

async function main() {
  console.log('🌱 Starting real congressional data seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.committeeMember.deleteMany();
  await prisma.committee.deleteMany();
  await prisma.member.deleteMany();

  // Create committees
  console.log('🏛️ Creating committees...');
  const committees = [
    { id: 'house-appropriations', name: 'House Committee on Appropriations' },
    { id: 'house-armed-services', name: 'House Committee on Armed Services' },
    { id: 'house-judiciary', name: 'House Committee on Judiciary' },
    { id: 'senate-appropriations', name: 'Senate Committee on Appropriations' },
    { id: 'senate-armed-services', name: 'Senate Committee on Armed Services' },
    { id: 'senate-judiciary', name: 'Senate Committee on Judiciary' },
  ];

  for (const committee of committees) {
    await prisma.committee.create({
      data: {
        id: committee.id,
        name: committee.name,
      },
    });
  }

  // Create real members
  console.log('👥 Creating real members...');
  for (const member of realMembers) {
    await prisma.member.create({
      data: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        chamber: member.chamber,
        state: member.state,
        district: member.district,
        party: member.party,
        dwNominate: Math.random() * 2 - 1, // Random DW-NOMINATE score
      },
    });

    // Assign random committees
    const chamberCommittees = committees.filter(c => 
      c.name.toLowerCase().includes(member.chamber)
    );
    const numCommittees = Math.floor(Math.random() * 2) + 1;
    const selectedCommittees = chamberCommittees
      .sort(() => 0.5 - Math.random())
      .slice(0, numCommittees);

    for (const committee of selectedCommittees) {
      await prisma.committeeMember.create({
        data: {
          id: `${member.id}-${committee.id}`,
          memberId: member.id,
          committeeId: committee.id,
        },
      });
    }
  }

  console.log('✅ Real data seeding complete!');
  console.log(`📊 Created ${realMembers.length} real members`);
  
  // Verify counts
  const houseCount = await prisma.member.count({ where: { chamber: 'house' } });
  const senateCount = await prisma.member.count({ where: { chamber: 'senate' } });
  const demCount = await prisma.member.count({ where: { party: 'D' } });
  const repCount = await prisma.member.count({ where: { party: 'R' } });
  const indCount = await prisma.member.count({ where: { party: 'I' } });
  
  console.log(`\n📈 Verification:`);
  console.log(`   House Representatives: ${houseCount}`);
  console.log(`   Senators: ${senateCount}`);
  console.log(`   Democrats: ${demCount}`);
  console.log(`   Republicans: ${repCount}`);
  console.log(`   Independents: ${indCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
