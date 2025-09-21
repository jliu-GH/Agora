import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAuthenticMembers() {
  console.log('🌱 Seeding authentic member profiles...');

  try {
    // Fetch all members to update their profiles
    const members = await prisma.member.findMany();

    for (const member of members) {
      // Generate authentic profile data
      const authenticData = generateAuthenticProfile(member);
      
      await prisma.member.update({
        where: { id: member.id },
        data: authenticData
      });
      
      console.log(`👤 Updated authentic profile for: ${member.firstName} ${member.lastName}`);
    }

    console.log('✅ Authentic member profiles seeded successfully!');
    console.log('🎭 Profiles now feature:');
    console.log('  - Authentic, conversational language');
    console.log('  - Emotional and passionate positions');
    console.log('  - Regional personality traits');
    console.log('  - Varied response formats');
    console.log('  - Real-world concerns and stories');

  } catch (error) {
    console.error('❌ Error seeding authentic profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateAuthenticProfile(member: any) {
  const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
  const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
  const district = member.district ? ` District ${member.district}` : '';
  
  return {
    bio: generateAuthenticBio(member, partyName, chamberName, district),
    politicalBackground: generatePoliticalBackground(member, partyName),
    keyPositions: JSON.stringify(generateKeyPositions(member, partyName)),
    recentBills: JSON.stringify(generateRecentBills(member, partyName)),
    votingRecord: JSON.stringify(generateVotingRecord(member, partyName)),
    contactInfo: JSON.stringify({
      govtrack: `https://www.govtrack.us/congress/members/${member.id}`,
      congress: `https://www.congress.gov/member/${member.firstName.toLowerCase()}-${member.lastName.toLowerCase()}/${member.id}`
    })
  };
}

function generateAuthenticBio(member: any, partyName: string, chamberName: string, district: string): string {
  const regionalTraits = getRegionalTraits(member.state);
  const personalityTraits = getPersonalityTraits(partyName);
  
  return `${member.firstName} ${member.lastName} is a ${partyName} ${chamberName} representative from ${member.state}${district}. ${regionalTraits.bio} ${personalityTraits.bio} ${member.firstName} brings a ${personalityTraits.approach} approach to representing ${member.state} in Washington, focusing on ${personalityTraits.focus} while staying connected to the real concerns of ${member.state} families.`;
}

function generatePoliticalBackground(member: any, partyName: string): string {
  const backgrounds = {
    Democratic: [
      `Came to politics because I saw too many working families struggling while the wealthy got ahead. I believe government can be a force for good when it works for people, not corporations.`,
      `Got involved in politics after seeing how the system was rigged against ordinary people. I'm here to fight for working families and make sure everyone gets a fair shot.`,
      `Entered politics because I was tired of watching politicians serve special interests instead of the people. I'm here to represent real people with real problems.`
    ],
    Republican: [
      `Came to Washington because I believe in limited government and individual freedom. I'm here to protect our constitutional rights and get government out of people's way.`,
      `Got involved in politics because I saw government growing too big and too intrusive. I'm here to fight for free markets and traditional American values.`,
      `Entered politics because I believe in the power of individual responsibility and free enterprise. I'm here to defend our freedoms and promote economic growth.`
    ],
    Independent: [
      `Came to Washington because I was tired of partisan gridlock and extreme politics. I'm here to find common-sense solutions that work for everyone.`,
      `Got involved in politics because both parties were too extreme and out of touch. I'm here to represent the forgotten middle and find practical solutions.`,
      `Entered politics because I believe we need leaders who put country over party. I'm here to work with anyone who wants to solve real problems.`
    ]
  };
  
  const partyBackgrounds = backgrounds[partyName as keyof typeof backgrounds];
  return partyBackgrounds[Math.floor(Math.random() * partyBackgrounds.length)];
}

function generateKeyPositions(member: any, partyName: string): string[] {
  const positions = {
    Democratic: [
      "Fighting for working families who are struggling to make ends meet",
      "Believes healthcare is a right, not a privilege - we can't let people go bankrupt because they get sick",
      "Passionate about protecting our environment for future generations",
      "Stands with workers and unions - they built this country",
      "Wants to make college affordable so kids aren't drowning in debt",
      "Believes in equal rights for everyone, no matter who you love or what you look like",
      "Frustrated with corporate greed and wants to hold big business accountable",
      "Thinks we need common-sense gun laws to keep our communities safe",
      "Trusts women to make their own healthcare decisions"
    ],
    Republican: [
      "Believes in the power of free markets and individual responsibility",
      "Thinks government is too big and needs to get out of people's way",
      "Strong supporter of the Second Amendment - it's about freedom",
      "Values traditional family structures and religious freedom",
      "Wants a strong military to protect our country",
      "Believes in American energy independence and domestic production",
      "Thinks parents should have choices in their kids' education",
      "Wants to protect the unborn and support pro-life policies",
      "Frustrated with wasteful government spending and bureaucracy"
    ],
    Independent: [
      "Tired of the partisan nonsense - we need practical solutions",
      "Thinks both parties are too extreme and out of touch",
      "Wants to fix our broken campaign finance system",
      "Believes in term limits to get fresh ideas in Washington",
      "Wants policies based on facts and data, not ideology",
      "Thinks we need to make it easier for people to vote",
      "Frustrated with the gridlock and wants to get things done"
    ]
  };
  
  const partyPositions = positions[partyName as keyof typeof positions];
  return partyPositions.slice(0, 6); // Return 6 positions
}

function generateRecentBills(member: any, partyName: string): string[] {
  const bills = {
    Democratic: [
      "Working on legislation to expand healthcare access and lower prescription drug costs",
      "Sponsoring bills to invest in clean energy and create green jobs",
      "Fighting for stronger worker protections and higher minimum wage",
      "Pushing for comprehensive immigration reform with a path to citizenship",
      "Supporting bills to strengthen voting rights and election security",
      "Working on infrastructure investments to create jobs and improve communities"
    ],
    Republican: [
      "Fighting to cut taxes and reduce government spending",
      "Working on bills to strengthen border security and immigration enforcement",
      "Supporting legislation to expand school choice and local control of education",
      "Pushing for energy independence and domestic resource production",
      "Working on bills to reduce regulations and help small businesses",
      "Supporting pro-life legislation and traditional family values"
    ],
    Independent: [
      "Working on bipartisan infrastructure and jobs legislation",
      "Pushing for campaign finance reform and government accountability",
      "Supporting bills to improve healthcare access and lower costs",
      "Working on immigration reform that balances security and compassion",
      "Pushing for term limits and congressional reform",
      "Supporting education and workforce development initiatives"
    ]
  };
  
  const partyBills = bills[partyName as keyof typeof bills];
  return partyBills.slice(0, 4); // Return 4 bills
}

function generateVotingRecord(member: any, partyName: string): string[] {
  const records = {
    Democratic: [
      "Votes with the party most of the time but isn't afraid to break ranks on local issues",
      "Always looks out for working families and the middle class in votes",
      "Gets passionate about environmental votes - climate change is personal",
      "Fights hard for healthcare votes - has seen too many families struggle",
      "Sometimes gets frustrated with the slow pace of progress",
      "Votes based on what's best for constituents, not party politics"
    ],
    Republican: [
      "Stands firm on constitutional principles and limited government",
      "Votes against wasteful spending - every dollar matters to taxpayers",
      "Strong on defense and security votes - keeps America safe",
      "Supports business and job creation through votes",
      "Gets frustrated with government overreach and bureaucracy",
      "Votes with conscience, not just party line"
    ],
    Independent: [
      "Votes based on what makes sense, not party loyalty",
      "Gets frustrated with both parties' extremes",
      "Looks for bipartisan solutions whenever possible",
      "Votes for what's best for the country, not politics",
      "Sometimes breaks with both parties on principle",
      "Focuses on practical solutions over ideology"
    ]
  };
  
  const partyRecords = records[partyName as keyof typeof records];
  return partyRecords.slice(0, 4); // Return 4 records
}

function getRegionalTraits(state: string) {
  const traits: { [key: string]: { bio: string } } = {
    'CA': { bio: "Born and raised in California, I understand the unique challenges facing our state - from tech innovation to environmental protection to housing affordability." },
    'TX': { bio: "A proud Texan, I bring that independent spirit and business-minded approach to Washington. I believe in limited government and individual freedom." },
    'NY': { bio: "From the Empire State, I know what it takes to get things done. I'm direct, I'm focused, and I fight for what's right for New York families." },
    'FL': { bio: "Florida's diverse communities have taught me the importance of listening to everyone and finding solutions that work for all of us." },
    'IL': { bio: "From the Land of Lincoln, I believe in honest government and standing up for working families. I'm here to represent all of Illinois, not just the powerful." },
    'PA': { bio: "Pennsylvania's working families are the backbone of our state. I'm here to fight for good-paying jobs and economic opportunity for everyone." },
    'OH': { bio: "Ohio's manufacturing heritage taught me the value of hard work and innovation. I'm here to bring that same work ethic to Washington." },
    'GA': { bio: "Georgia's rich history and diverse communities have shaped my approach to politics. I believe in bringing people together to solve problems." },
    'NC': { bio: "North Carolina's mix of urban and rural communities gives me a unique perspective on the challenges facing our nation." },
    'MI': { bio: "Michigan's auto industry and Great Lakes taught me the importance of both economic growth and environmental protection." }
  };
  
  return traits[state] || { bio: `Representing ${state}, I bring the values and concerns of our state to Washington.` };
}

function getPersonalityTraits(partyName: string) {
  const traits = {
    Democratic: {
      bio: "I'm passionate about social justice and believe government should work for everyone, not just the wealthy few.",
      approach: "people-first",
      focus: "helping working families and protecting our most vulnerable citizens"
    },
    Republican: {
      bio: "I believe in individual freedom, limited government, and the power of free markets to create opportunity for everyone.",
      approach: "freedom-focused",
      focus: "protecting constitutional rights and promoting economic growth"
    },
    Independent: {
      bio: "I'm tired of partisan politics and believe we need practical solutions that work for real people.",
      approach: "common-sense",
      focus: "finding bipartisan solutions and putting country over party"
    }
  };
  
  return traits[partyName as keyof typeof traits];
}

seedAuthenticMembers();
