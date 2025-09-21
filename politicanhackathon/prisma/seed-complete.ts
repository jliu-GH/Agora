import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// House districts by state (based on 2020 census apportionment)
const houseDistricts: Record<string, number> = {
  'AL': 7, 'AK': 1, 'AZ': 9, 'AR': 4, 'CA': 52, 'CO': 8, 'CT': 5, 'DE': 1,
  'FL': 28, 'GA': 14, 'HI': 2, 'ID': 2, 'IL': 17, 'IN': 9, 'IA': 4, 'KS': 4,
  'KY': 6, 'LA': 6, 'ME': 2, 'MD': 8, 'MA': 9, 'MI': 13, 'MN': 8, 'MS': 4,
  'MO': 8, 'MT': 2, 'NE': 3, 'NV': 4, 'NH': 2, 'NJ': 12, 'NM': 3, 'NY': 26,
  'NC': 14, 'ND': 1, 'OH': 15, 'OK': 5, 'OR': 6, 'PA': 17, 'RI': 2, 'SC': 7,
  'SD': 1, 'TN': 9, 'TX': 38, 'UT': 4, 'VT': 1, 'VA': 11, 'WA': 10, 'WV': 2,
  'WI': 8, 'WY': 1
};

// State names
const stateNames: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

// Governor data
const governors: Record<string, { name: string; party: string }> = {
  'AL': { name: 'Kay Ivey', party: 'R' }, 'AK': { name: 'Mike Dunleavy', party: 'R' },
  'AZ': { name: 'Katie Hobbs', party: 'D' }, 'AR': { name: 'Sarah Huckabee Sanders', party: 'R' },
  'CA': { name: 'Gavin Newsom', party: 'D' }, 'CO': { name: 'Jared Polis', party: 'D' },
  'CT': { name: 'Ned Lamont', party: 'D' }, 'DE': { name: 'John Carney', party: 'D' },
  'FL': { name: 'Ron DeSantis', party: 'R' }, 'GA': { name: 'Brian Kemp', party: 'R' },
  'HI': { name: 'Josh Green', party: 'D' }, 'ID': { name: 'Brad Little', party: 'R' },
  'IL': { name: 'J.B. Pritzker', party: 'D' }, 'IN': { name: 'Eric Holcomb', party: 'R' },
  'IA': { name: 'Kim Reynolds', party: 'R' }, 'KS': { name: 'Laura Kelly', party: 'D' },
  'KY': { name: 'Andy Beshear', party: 'D' }, 'LA': { name: 'Jeff Landry', party: 'R' },
  'ME': { name: 'Janet Mills', party: 'D' }, 'MD': { name: 'Wes Moore', party: 'D' },
  'MA': { name: 'Maura Healey', party: 'D' }, 'MI': { name: 'Gretchen Whitmer', party: 'D' },
  'MN': { name: 'Tim Walz', party: 'D' }, 'MS': { name: 'Tate Reeves', party: 'R' },
  'MO': { name: 'Mike Parson', party: 'R' }, 'MT': { name: 'Greg Gianforte', party: 'R' },
  'NE': { name: 'Jim Pillen', party: 'R' }, 'NV': { name: 'Joe Lombardo', party: 'R' },
  'NH': { name: 'Chris Sununu', party: 'R' }, 'NJ': { name: 'Phil Murphy', party: 'D' },
  'NM': { name: 'Michelle Lujan Grisham', party: 'D' }, 'NY': { name: 'Kathy Hochul', party: 'D' },
  'NC': { name: 'Roy Cooper', party: 'D' }, 'ND': { name: 'Doug Burgum', party: 'R' },
  'OH': { name: 'Mike DeWine', party: 'R' }, 'OK': { name: 'Kevin Stitt', party: 'R' },
  'OR': { name: 'Tina Kotek', party: 'D' }, 'PA': { name: 'Josh Shapiro', party: 'D' },
  'RI': { name: 'Dan McKee', party: 'D' }, 'SC': { name: 'Henry McMaster', party: 'R' },
  'SD': { name: 'Kristi Noem', party: 'R' }, 'TN': { name: 'Bill Lee', party: 'R' },
  'TX': { name: 'Greg Abbott', party: 'R' }, 'UT': { name: 'Spencer Cox', party: 'R' },
  'VT': { name: 'Phil Scott', party: 'R' }, 'VA': { name: 'Glenn Youngkin', party: 'R' },
  'WA': { name: 'Jay Inslee', party: 'D' }, 'WV': { name: 'Jim Justice', party: 'R' },
  'WI': { name: 'Tony Evers', party: 'D' }, 'WY': { name: 'Mark Gordon', party: 'R' }
};

// Common first names for realistic data
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
  'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
  'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah',
  'Timothy', 'Dorothy', 'Ronald', 'Lisa', 'Jason', 'Nancy', 'Edward', 'Karen',
  'Jeffrey', 'Betty', 'Ryan', 'Helen', 'Jacob', 'Sandra', 'Gary', 'Donna',
  'Nicholas', 'Carol', 'Eric', 'Ruth', 'Jonathan', 'Sharon', 'Stephen', 'Michelle',
  'Larry', 'Laura', 'Justin', 'Sarah', 'Scott', 'Kimberly', 'Brandon', 'Deborah',
  'Benjamin', 'Dorothy', 'Samuel', 'Amy', 'Gregory', 'Angela', 'Alexander', 'Brenda',
  'Patrick', 'Emma', 'Jack', 'Olivia', 'Dennis', 'Cynthia', 'Jerry', 'Marie',
  'Tyler', 'Janet', 'Aaron', 'Catherine', 'Jose', 'Frances', 'Henry', 'Christine',
  'Adam', 'Samantha', 'Douglas', 'Debra', 'Nathan', 'Rachel', 'Peter', 'Carolyn',
  'Zachary', 'Janet', 'Kyle', 'Virginia', 'Noah', 'Maria', 'Alan', 'Heather',
  'Jeremy', 'Diane', 'Carl', 'Julie', 'Arthur', 'Joyce', 'Gerald', 'Victoria',
  'Keith', 'Kelly', 'Roger', 'Christina', 'Lawrence', 'Joan', 'Sean', 'Evelyn',
  'Christian', 'Judith', 'Albert', 'Megan', 'Wayne', 'Cheryl', 'Eugene', 'Mildred',
  'Louis', 'Katherine', 'Philip', 'Joan', 'Bobby', 'Teresa', 'Johnny', 'Judy',
  'Austin', 'Beverly', 'Roy', 'Denise', 'Eugene', 'Tammy', 'Louis', 'Irene',
  'Philip', 'Jane', 'Bobby', 'Lori', 'Johnny', 'Rachel', 'Austin', 'Marilyn',
  'Roy', 'Andrea', 'Eugene', 'Kathryn', 'Louis', 'Janice', 'Philip', 'Sara',
  'Bobby', 'Marie', 'Johnny', 'Julia', 'Austin', 'Grace', 'Roy', 'Judy',
  'Eugene', 'Theresa', 'Louis', 'Madison', 'Philip', 'Beverly', 'Bobby', 'Denise',
  'Johnny', 'Tammy', 'Austin', 'Irene', 'Roy', 'Jane', 'Eugene', 'Lori',
  'Louis', 'Rachel', 'Philip', 'Marilyn', 'Bobby', 'Andrea', 'Johnny', 'Kathryn',
  'Austin', 'Janice', 'Roy', 'Sara', 'Eugene', 'Marie', 'Louis', 'Julia',
  'Philip', 'Grace', 'Bobby', 'Judy', 'Johnny', 'Theresa', 'Austin', 'Madison'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
  'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher',
  'Vasquez', 'Simmons', 'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham',
  'Reynolds', 'Griffin', 'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant',
  'Herrera', 'Gibson', 'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray',
  'Ford', 'Castro', 'Marshall', 'Owens', 'Harrison', 'Fernandez', 'McDonald', 'Woods',
  'Washington', 'Kennedy', 'Wells', 'Vargas', 'Henry', 'Chen', 'Freeman', 'Webb',
  'Tucker', 'Guzman', 'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter',
  'Gordon', 'Mendez', 'Silva', 'Shaw', 'Snyder', 'Mason', 'Dixon', 'Munoz',
  'Hunt', 'Hicks', 'Holmes', 'Palmer', 'Wagner', 'Black', 'Robertson', 'Boyd',
  'Rose', 'Stone', 'Salazar', 'Fox', 'Warren', 'Mills', 'Meyer', 'Rice',
  'Schmidt', 'Garza', 'Daniels', 'Ferguson', 'Nichols', 'Stephens', 'Soto', 'Weaver',
  'Ryan', 'Larson', 'Frazier', 'Fields', 'Armstrong', 'Gardner', 'Kane', 'Burns',
  'Carr', 'Owens', 'Porter', 'Spencer', 'Peters', 'Hawkins', 'Grant', 'Hansen',
  'Castro', 'Hoffman', 'Hart', 'Elliott', 'Cunningham', 'Knight', 'Bradley', 'Carroll',
  'Hudson', 'Duncan', 'Armstrong', 'Berry', 'Andrews', 'Johnston', 'Ray', 'Lane',
  'Riley', 'Carpenter', 'Perkins', 'Aguilar', 'Silva', 'Richards', 'Willis', 'Matthews',
  'Chapman', 'Lawrence', 'Garza', 'Vargas', 'Watkins', 'Wheeler', 'Larson', 'Carlson',
  'Harper', 'George', 'Greene', 'Burke', 'Guzman', 'Morrison', 'Jacobs', 'O\'Brien',
  'Lawson', 'Franklin', 'Lynch', 'Bishop', 'Carr', 'Salazar', 'Austin', 'Mendez',
  'Gilbert', 'Jensen', 'Williamson', 'Montgomery', 'Harvey', 'Oliver', 'Howell', 'Dean',
  'Hanson', 'Weber', 'Garrett', 'Sims', 'Burton', 'Fuller', 'Sanders', 'Reeves',
  'Curry', 'Todd', 'Porter', 'Potter', 'Goodwin', 'Walton', 'Rowe', 'Hampton',
  'Ortega', 'Patton', 'Swanson', 'Joseph', 'Francis', 'Goodman', 'Maldonado', 'Yates',
  'Becker', 'Erickson', 'Hodges', 'Rios', 'Conner', 'Adkins', 'Webster', 'Norman',
  'Malone', 'Hammond', 'Flowers', 'Cobb', 'Moody', 'Robbins', 'Solomon', 'Mathis',
  'Mullins', 'Fleming', 'Owen', 'Rock', 'Sterling', 'Davenport', 'Waters', 'Barnett',
  'Bates', 'Santana', 'Strickland', 'Reed', 'Barton', 'Horton', 'Hale', 'York',
  'Higgins', 'Le', 'Miles', 'Lyons', 'Huff', 'Briggs', 'Haynes', 'Mays',
  'Hurst', 'Padilla', 'Marsh', 'Mccarthy', 'Mccormick', 'Mccoy', 'Mcdonald', 'Mcdowell',
  'Mcfarland', 'Mckee', 'Mckinney', 'Mclaughlin', 'Mclean', 'Mcmahon', 'Mcmillan', 'Mcneil',
  'Mcpherson', 'Meadows', 'Medina', 'Mejia', 'Melendez', 'Melton', 'Mendez', 'Mendoza',
  'Mercado', 'Mercer', 'Merrill', 'Merritt', 'Meyer', 'Meyers', 'Michael', 'Middleton',
  'Miles', 'Miller', 'Mills', 'Miranda', 'Mitchell', 'Molina', 'Monroe', 'Montgomery',
  'Montoya', 'Moody', 'Moon', 'Mooney', 'Moore', 'Morales', 'Moran', 'Moreno',
  'Morgan', 'Morris', 'Morrison', 'Morrow', 'Morse', 'Morton', 'Moses', 'Mosley',
  'Moss', 'Mueller', 'Mullen', 'Mullins', 'Mullins', 'Munoz', 'Murphy', 'Murray',
  'Myers', 'Nash', 'Navarro', 'Neal', 'Nelson', 'Newman', 'Newton', 'Nguyen',
  'Nichols', 'Nicholson', 'Nielsen', 'Nieves', 'Nixon', 'Noble', 'Noel', 'Nolan',
  'Norman', 'Norris', 'Norton', 'Nunez', 'O\'Brien', 'O\'Connor', 'O\'Donnell', 'O\'Neal',
  'O\'Neill', 'Ochoa', 'Odom', 'Ojeda', 'Olsen', 'Olson', 'Oneal', 'Oneill',
  'Orr', 'Ortega', 'Ortiz', 'Osborn', 'Osborne', 'Owen', 'Owens', 'Pace',
  'Pacheco', 'Padilla', 'Page', 'Palmer', 'Parker', 'Parks', 'Parrish', 'Parsons',
  'Pate', 'Patel', 'Patrick', 'Patterson', 'Patton', 'Paul', 'Payne', 'Pearson',
  'Peck', 'Pena', 'Pennington', 'Perez', 'Perkins', 'Perry', 'Peters', 'Peterson',
  'Petty', 'Phelps', 'Phillips', 'Pickett', 'Pierce', 'Pittman', 'Pitts', 'Pitts',
  'Pittman', 'Pitts', 'Pitts', 'Pittman', 'Pitts', 'Pitts', 'Pittman', 'Pitts'
];

// Committee data
const committees = [
  { name: 'House Committee on Agriculture', chamber: 'house' },
  { name: 'House Committee on Appropriations', chamber: 'house' },
  { name: 'House Committee on Armed Services', chamber: 'house' },
  { name: 'House Committee on Budget', chamber: 'house' },
  { name: 'House Committee on Education and Labor', chamber: 'house' },
  { name: 'House Committee on Energy and Commerce', chamber: 'house' },
  { name: 'House Committee on Financial Services', chamber: 'house' },
  { name: 'House Committee on Foreign Affairs', chamber: 'house' },
  { name: 'House Committee on Homeland Security', chamber: 'house' },
  { name: 'House Committee on House Administration', chamber: 'house' },
  { name: 'House Committee on Intelligence', chamber: 'house' },
  { name: 'House Committee on Judiciary', chamber: 'house' },
  { name: 'House Committee on Natural Resources', chamber: 'house' },
  { name: 'House Committee on Oversight and Reform', chamber: 'house' },
  { name: 'House Committee on Rules', chamber: 'house' },
  { name: 'House Committee on Science, Space, and Technology', chamber: 'house' },
  { name: 'House Committee on Small Business', chamber: 'house' },
  { name: 'House Committee on Transportation and Infrastructure', chamber: 'house' },
  { name: 'House Committee on Veterans\' Affairs', chamber: 'house' },
  { name: 'House Committee on Ways and Means', chamber: 'house' },
  { name: 'Senate Committee on Agriculture, Nutrition, and Forestry', chamber: 'senate' },
  { name: 'Senate Committee on Appropriations', chamber: 'senate' },
  { name: 'Senate Committee on Armed Services', chamber: 'senate' },
  { name: 'Senate Committee on Banking, Housing, and Urban Affairs', chamber: 'senate' },
  { name: 'Senate Committee on Budget', chamber: 'senate' },
  { name: 'Senate Committee on Commerce, Science, and Transportation', chamber: 'senate' },
  { name: 'Senate Committee on Energy and Natural Resources', chamber: 'senate' },
  { name: 'Senate Committee on Environment and Public Works', chamber: 'senate' },
  { name: 'Senate Committee on Finance', chamber: 'senate' },
  { name: 'Senate Committee on Foreign Relations', chamber: 'senate' },
  { name: 'Senate Committee on Health, Education, Labor, and Pensions', chamber: 'senate' },
  { name: 'Senate Committee on Homeland Security and Governmental Affairs', chamber: 'senate' },
  { name: 'Senate Committee on Intelligence', chamber: 'senate' },
  { name: 'Senate Committee on Judiciary', chamber: 'senate' },
  { name: 'Senate Committee on Rules and Administration', chamber: 'senate' },
  { name: 'Senate Committee on Small Business and Entrepreneurship', chamber: 'senate' },
  { name: 'Senate Committee on Veterans\' Affairs', chamber: 'senate' }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateMemberName(): { firstName: string; lastName: string } {
  return {
    firstName: getRandomElement(firstNames),
    lastName: getRandomElement(lastNames)
  };
}

function generateParty(): string {
  const parties = ['D', 'R', 'I'];
  const weights = [45, 45, 10]; // 45% D, 45% R, 10% I
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (let i = 0; i < parties.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return parties[i];
    }
  }
  return 'D'; // fallback
}

function generateDwNominate(): number {
  // Generate DW-NOMINATE scores: -1 (most liberal) to +1 (most conservative)
  return Math.random() * 2 - 1;
}

async function main() {
  console.log('🌱 Starting complete database seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.committeeMember.deleteMany();
  await prisma.committee.deleteMany();
  await prisma.member.deleteMany();

  // Create committees
  console.log('🏛️ Creating committees...');
  const createdCommittees = [];
  for (const committee of committees) {
    const created = await prisma.committee.create({
      data: {
        id: committee.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: committee.name,
      },
    });
    createdCommittees.push({ ...created, chamber: committee.chamber });
  }

  // Create members for all states
  console.log('👥 Creating members...');
  let totalMembers = 0;

  for (const [stateCode, stateName] of Object.entries(stateNames)) {
    console.log(`📍 Processing ${stateName} (${stateCode})...`);
    
    const houseDistrictsCount = houseDistricts[stateCode];
    
    // Create 2 Senators for each state
    for (let i = 1; i <= 2; i++) {
      const { firstName, lastName } = generateMemberName();
      const party = generateParty();
      
      const senator = await prisma.member.create({
        data: {
          id: `${stateCode}S${i}`,
          firstName,
          lastName,
          chamber: 'senate',
          state: stateCode,
          party,
          dwNominate: generateDwNominate(),
        },
      });
      totalMembers++;

      // Assign 2-4 random committees
      const senateCommittees = createdCommittees.filter(c => c.chamber === 'senate');
      const numCommittees = Math.floor(Math.random() * 3) + 2; // 2-4 committees
      const selectedCommittees = senateCommittees
        .sort(() => 0.5 - Math.random())
        .slice(0, numCommittees);

      for (const committee of selectedCommittees) {
        await prisma.committeeMember.create({
          data: {
            id: `${senator.id}-${committee.id}`,
            memberId: senator.id,
            committeeId: committee.id,
          },
        });
      }
    }

    // Create House Representatives for each state
    for (let i = 1; i <= houseDistrictsCount; i++) {
      const { firstName, lastName } = generateMemberName();
      const party = generateParty();
      
      const representative = await prisma.member.create({
        data: {
          id: `${stateCode}H${i.toString().padStart(2, '0')}`,
          firstName,
          lastName,
          chamber: 'house',
          state: stateCode,
          district: i.toString().padStart(2, '0'),
          party,
          dwNominate: generateDwNominate(),
        },
      });
      totalMembers++;

      // Assign 1-3 random committees
      const houseCommittees = createdCommittees.filter(c => c.chamber === 'house');
      const numCommittees = Math.floor(Math.random() * 3) + 1; // 1-3 committees
      const selectedCommittees = houseCommittees
        .sort(() => 0.5 - Math.random())
        .slice(0, numCommittees);

      for (const committee of selectedCommittees) {
        await prisma.committeeMember.create({
          data: {
            id: `${representative.id}-${committee.id}`,
            memberId: representative.id,
            committeeId: committee.id,
          },
        });
      }
    }
  }

  // Create a sample bill
  console.log('📜 Creating sample bill...');
  await prisma.bill.create({
    data: {
      id: 'hr123-118',
      title: 'Sample Infrastructure Bill',
      summary: 'A bill to improve national infrastructure and create jobs.',
      congress: 118,
      chamber: 'house',
      status: 'introduced',
      sponsorId: 'CAH01', // Assuming CA has at least 1 representative
    },
  });

  console.log('✅ Seeding complete!');
  console.log(`📊 Created ${totalMembers} total members`);
  console.log(`🏛️ Created ${createdCommittees.length} committees`);
  console.log(`📜 Created 1 sample bill`);
  
  // Verify counts
  const houseCount = await prisma.member.count({ where: { chamber: 'house' } });
  const senateCount = await prisma.member.count({ where: { chamber: 'senate' } });
  
  console.log(`\n📈 Verification:`);
  console.log(`   House Representatives: ${houseCount} (expected: 435)`);
  console.log(`   Senators: ${senateCount} (expected: 100)`);
  console.log(`   Total Members: ${houseCount + senateCount} (expected: 535)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
