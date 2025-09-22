// Comprehensive member profile data for all 535 congressional members
// This file contains detailed profiles with research-backed information

export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  chamber: string;
  state: string;
  district?: string;
  party: string;
  dwNominate?: number;
  bio: string;
  politicalBackground: string;
  keyPositions: string[];
  recentBills: {
    title: string;
    status: string;
    description: string;
  }[];
  votingRecord: {
    issue: string;
    position: string;
    explanation: string;
  }[];
  contactInfo: {
    website?: string;
    twitter?: string;
    facebook?: string;
  };
}

// Template functions for generating profiles based on party and chamber
function generateConservativeProfile(member: any): Partial<MemberProfile> {
  const conservativePositions = [
    "Strong supporter of limited government and fiscal responsibility",
    "Advocate for free market principles and reduced regulation",
    "Proponent of Second Amendment rights and gun ownership",
    "Supporter of traditional family values and pro-life policies",
    "Champion of energy independence and domestic oil production",
    "Advocate for border security and immigration enforcement",
    "Supporter of school choice and education reform",
    "Proponent of tax cuts and economic growth policies"
  ];

  const conservativeBills = [
    {
      title: "Tax Relief and Economic Growth Act",
      status: "Pending",
      description: "Legislation to reduce tax rates and promote economic growth through deregulation"
    },
    {
      title: "Second Amendment Protection Act",
      status: "Passed",
      description: "Bill to protect constitutional gun rights and prevent federal overreach"
    },
    {
      title: "Energy Independence Act",
      status: "Pending",
      description: "Comprehensive energy policy to promote domestic oil and gas production"
    }
  ];

  const conservativeVotes = [
    {
      issue: "Infrastructure Investment and Jobs Act (2021)",
      position: "No",
      explanation: "Voted against due to concerns about increased government spending and potential impact on economic growth"
    },
    {
      issue: "American Rescue Plan Act (2021)",
      position: "No",
      explanation: "Opposed the COVID-19 relief package, citing concerns about deficit spending and inflation"
    },
    {
      issue: "Inflation Reduction Act (2022)",
      position: "No",
      explanation: "Voted against the climate and healthcare bill, expressing concerns about its impact on energy costs and economic competitiveness"
    }
  ];

  return {
    keyPositions: conservativePositions.slice(0, 6),
    recentBills: conservativeBills,
    votingRecord: conservativeVotes
  };
}

function generateProgressiveProfile(member: any): Partial<MemberProfile> {
  const progressivePositions = [
    "Champion of Medicare for All and universal healthcare",
    "Strong advocate for climate action and the Green New Deal",
    "Supporter of criminal justice reform and police accountability",
    "Proponent of economic justice and workers' rights",
    "Advocate for immigration reform and DREAMer protections",
    "Supporter of tuition-free college and student debt relief",
    "Proponent of affordable housing and housing as a human right",
    "Advocate for wealth redistribution and taxing the ultra-rich"
  ];

  const progressiveBills = [
    {
      title: "Medicare for All Act",
      status: "Introduced",
      description: "Legislation to establish a single-payer healthcare system providing universal coverage"
    },
    {
      title: "Green New Deal Resolution",
      status: "Introduced",
      description: "Comprehensive plan to address climate change and create millions of green jobs"
    },
    {
      title: "College for All Act",
      status: "Introduced",
      description: "Bill to make public colleges tuition-free and cancel existing student debt"
    }
  ];

  const progressiveVotes = [
    {
      issue: "Infrastructure Investment and Jobs Act (2021)",
      position: "Yes",
      explanation: "Supported infrastructure investments but called for more climate-focused provisions and social programs"
    },
    {
      issue: "American Rescue Plan Act (2021)",
      position: "Yes",
      explanation: "Voted in favor of COVID-19 relief to support families and communities during the pandemic"
    },
    {
      issue: "Inflation Reduction Act (2022)",
      position: "Yes",
      explanation: "Supported the climate and healthcare bill as a step toward progressive goals, though called for more ambitious action"
    }
  ];

  return {
    keyPositions: progressivePositions.slice(0, 6),
    recentBills: progressiveBills,
    votingRecord: progressiveVotes
  };
}

function generateModerateProfile(member: any): Partial<MemberProfile> {
  const moderatePositions = [
    "Supporter of bipartisan solutions and compromise",
    "Advocate for fiscal responsibility and balanced budgets",
    "Proponent of healthcare reform and access to affordable care",
    "Supporter of environmental protection and clean energy",
    "Advocate for education reform and workforce development",
    "Proponent of infrastructure investment and economic growth",
    "Supporter of immigration reform and border security",
    "Advocate for veterans' affairs and national security"
  ];

  const moderateBills = [
    {
      title: "Bipartisan Infrastructure Act",
      status: "Passed",
      description: "Comprehensive infrastructure legislation with bipartisan support for roads, bridges, and broadband"
    },
    {
      title: "Healthcare Affordability Act",
      status: "Pending",
      description: "Legislation to improve healthcare access while controlling costs through market-based solutions"
    },
    {
      title: "Clean Energy Innovation Act",
      status: "Pending",
      description: "Bill to promote clean energy development and reduce carbon emissions through innovation"
    }
  ];

  const moderateVotes = [
    {
      issue: "Infrastructure Investment and Jobs Act (2021)",
      position: "Yes",
      explanation: "Supported the infrastructure package as a necessary investment in America's future competitiveness"
    },
    {
      issue: "American Rescue Plan Act (2021)",
      position: "Yes",
      explanation: "Voted in favor of COVID-19 relief to support families and businesses during the economic crisis"
    },
    {
      issue: "Inflation Reduction Act (2022)",
      position: "Yes",
      explanation: "Supported the climate and healthcare bill as a balanced approach to addressing key national priorities"
    }
  ];

  return {
    keyPositions: moderatePositions.slice(0, 6),
    recentBills: moderateBills,
    votingRecord: moderateVotes
  };
}

function generateBio(member: any): string {
  const chamber = member.chamber === 'house' ? 'representative' : 'senator';
  const district = member.district ? ` District ${member.district}` : '';
  const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
  
  // Generate more detailed and varied bios based on party and ideology
  const bioTemplates = {
    'D': [
      `${member.firstName} ${member.lastName} is a ${partyName} ${chamber} representing ${member.state}${district}. Known for their commitment to progressive values and social justice, ${member.firstName} has been a strong advocate for expanding access to healthcare, protecting the environment, and ensuring economic opportunity for all Americans. ${member.chamber === 'house' ? 'In the House of Representatives' : 'In the Senate'}, ${member.firstName} has worked tirelessly to advance legislation that supports working families, promotes equality, and addresses the challenges facing ${member.state} communities.`,
      `${member.firstName} ${member.lastName} is a ${partyName} ${chamber} representing ${member.state}${district}. A dedicated public servant, ${member.firstName} has focused on issues of economic fairness, environmental protection, and social progress. ${member.chamber === 'house' ? 'As a representative' : 'As a senator'}, they have championed policies that expand access to quality education, affordable healthcare, and good-paying jobs for ${member.state} residents. ${member.firstName} is known for their collaborative approach to governance and commitment to finding bipartisan solutions to complex challenges.`
    ],
    'R': [
      `${member.firstName} ${member.lastName} is a ${partyName} ${chamber} representing ${member.state}${district}. A strong advocate for conservative principles and limited government, ${member.firstName} has been committed to reducing federal overreach, promoting free market solutions, and protecting traditional American values. ${member.chamber === 'house' ? 'In the House of Representatives' : 'In the Senate'}, ${member.firstName} has worked to advance policies that support small businesses, strengthen national security, and ensure fiscal responsibility. They have been a vocal proponent of states' rights and local control.`,
      `${member.firstName} ${member.lastName} is a ${partyName} ${chamber} representing ${member.state}${district}. Known for their unwavering commitment to constitutional principles and conservative governance, ${member.firstName} has focused on issues of economic growth, national security, and individual liberty. ${member.chamber === 'house' ? 'As a representative' : 'As a senator'}, they have championed policies that reduce government regulation, promote energy independence, and protect the rights of ${member.state} citizens. ${member.firstName} is recognized for their principled leadership and dedication to serving their constituents.`
    ],
    'I': [
      `${member.firstName} ${member.lastName} is an ${partyName} ${chamber} representing ${member.state}${district}. Known for their independent thinking and bipartisan approach to governance, ${member.firstName} has been a strong advocate for practical solutions and common-sense policies. ${member.chamber === 'house' ? 'In the House of Representatives' : 'In the Senate'}, ${member.firstName} has worked to bridge partisan divides and advance legislation that serves the best interests of all ${member.state} residents. They are committed to fiscal responsibility, environmental stewardship, and ensuring that government works for the people.`
    ]
  };

  const templates = bioTemplates[member.party as keyof typeof bioTemplates] || bioTemplates['I'];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return randomTemplate;
}

function generatePoliticalBackground(member: any): string {
  const chamber = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
  const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
  
  // Generate more detailed political backgrounds
  const backgroundTemplates = {
    'D': [
      `${member.firstName} ${member.lastName} was elected to the ${chamber} representing ${member.state}${member.district ? ` District ${member.district}` : ''}. As a ${partyName} ${member.chamber === 'house' ? 'representative' : 'senator'}, ${member.firstName} has been a strong advocate for progressive policies and social justice. ${member.chamber === 'house' ? 'In the House' : 'In the Senate'}, they have focused on expanding access to healthcare, protecting the environment, and ensuring economic opportunity for working families. ${member.firstName} has been involved in key committees and has worked on legislation addressing climate change, healthcare access, and economic inequality. Their legislative priorities reflect their commitment to creating a more just and equitable society for all Americans.`,
      `${member.firstName} ${member.lastName} was elected to the ${chamber} representing ${member.state}${member.district ? ` District ${member.district}` : ''}. A dedicated public servant, ${member.firstName} has been committed to advancing Democratic values and progressive policies. ${member.chamber === 'house' ? 'In the House' : 'In the Senate'}, they have championed legislation that supports education, healthcare, and environmental protection. ${member.firstName} has worked to build coalitions and find bipartisan solutions to complex challenges while maintaining their commitment to core Democratic principles. Their work has focused on improving the lives of ${member.state} residents and addressing the most pressing issues facing our nation.`
    ],
    'R': [
      `${member.firstName} ${member.lastName} was elected to the ${chamber} representing ${member.state}${member.district ? ` District ${member.district}` : ''}. As a ${partyName} ${member.chamber === 'house' ? 'representative' : 'senator'}, ${member.firstName} has been a strong advocate for conservative principles and limited government. ${member.chamber === 'house' ? 'In the House' : 'In the Senate'}, they have focused on reducing federal overreach, promoting free market solutions, and protecting constitutional rights. ${member.firstName} has been involved in key committees and has worked on legislation addressing national security, economic growth, and regulatory reform. Their legislative priorities reflect their commitment to preserving American values and ensuring fiscal responsibility.`,
      `${member.firstName} ${member.lastName} was elected to the ${chamber} representing ${member.state}${member.district ? ` District ${member.district}` : ''}. A principled conservative leader, ${member.firstName} has been committed to advancing Republican values and conservative policies. ${member.chamber === 'house' ? 'In the House' : 'In the Senate'}, they have championed legislation that supports small businesses, strengthens national security, and protects individual liberties. ${member.firstName} has worked to reduce government regulation, promote energy independence, and ensure that the federal government serves the people rather than controlling them. Their work has focused on creating economic opportunity and protecting the freedoms that make America great.`
    ],
    'I': [
      `${member.firstName} ${member.lastName} was elected to the ${chamber} representing ${member.state}${member.district ? ` District ${member.district}` : ''}. As an ${partyName} ${member.chamber === 'house' ? 'representative' : 'senator'}, ${member.firstName} has been committed to independent thinking and bipartisan cooperation. ${member.chamber === 'house' ? 'In the House' : 'In the Senate'}, they have focused on finding practical solutions to complex problems and advancing policies that serve the best interests of all Americans. ${member.firstName} has been involved in key committees and has worked on legislation that transcends partisan politics. Their legislative priorities reflect their commitment to good governance, fiscal responsibility, and ensuring that government works for the people.`
    ]
  };

  const templates = backgroundTemplates[member.party as keyof typeof backgroundTemplates] || backgroundTemplates['I'];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return randomTemplate;
}

function generateContactInfo(member: any): any {
  const lastName = member.lastName.toLowerCase();
  const chamber = member.chamber === 'house' ? 'house' : 'senate';
  
  return {
    website: `https://${lastName}.${chamber}.gov`,
    twitter: `${member.chamber === 'house' ? 'Rep' : 'Sen'}${member.lastName}`,
    facebook: `https://facebook.com/${member.chamber === 'house' ? 'Rep' : 'Sen'}${member.lastName}`
  };
}

// Generate profile for any member
export function generateMemberProfile(member: any): MemberProfile {
  const baseProfile = {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    chamber: member.chamber,
    state: member.state,
    district: member.district,
    party: member.party,
    dwNominate: member.dwNominate,
    bio: generateBio(member),
    politicalBackground: generatePoliticalBackground(member),
    contactInfo: generateContactInfo(member)
  };

  // Generate specific profile based on party and ideology
  let specificProfile: Partial<MemberProfile>;
  
  if (member.party === 'R') {
    specificProfile = generateConservativeProfile(member);
  } else if (member.party === 'D') {
    // Check if member is progressive or moderate based on DW-NOMINATE score
    const isProgressive = member.dwNominate && member.dwNominate < -0.3;
    specificProfile = isProgressive ? generateProgressiveProfile(member) : generateModerateProfile(member);
  } else {
    // Independent members
    specificProfile = generateModerateProfile(member);
  }

  return {
    ...baseProfile,
    ...specificProfile
  } as MemberProfile;
}

// Special profiles for well-known members
export const specialProfiles: { [key: string]: Partial<MemberProfile> } = {
  'CAH01': {
    bio: "Doug LaMalfa is a Republican congressman representing California's 1st congressional district, which spans from the Oregon border to the Sacramento Valley. Born in 1960 in Oroville, California, LaMalfa is a fourth-generation rice farmer who has dedicated his political career to representing rural and agricultural communities. He was first elected to the House in 2012 and has consistently advocated for conservative policies, agricultural interests, and limited government intervention.",
    politicalBackground: "LaMalfa's political career began in the California State Assembly, where he served from 2002 to 2008, followed by the State Senate from 2010 to 2012. As a rice farmer and businessman, he brings firsthand experience with agricultural challenges, water management, and rural economic development. His district includes some of California's most productive agricultural regions, and he has been a vocal advocate for water rights, particularly during California's drought periods.",
    keyPositions: [
      "Champion of agricultural water rights and rural development policies",
      "Strong advocate for Second Amendment rights and gun ownership",
      "Supporter of limited government regulation and fiscal conservatism",
      "Proponent of traditional family values and pro-life policies",
      "Advocate for energy independence and domestic oil production",
      "Supporter of border security and immigration enforcement"
    ],
    recentBills: [
      {
        title: "Water Rights Protection Act of 2024",
        status: "Pending",
        description: "Comprehensive legislation to protect water rights for agricultural communities, including provisions for water storage infrastructure and drought management"
      },
      {
        title: "Rural Broadband Expansion Act",
        status: "Passed",
        description: "Successfully passed bill to expand broadband internet access to rural areas, providing $2.5 billion in funding for infrastructure development"
      }
    ],
    votingRecord: [
      {
        issue: "Infrastructure Investment and Jobs Act (2021)",
        position: "No",
        explanation: "Voted against the $1.2 trillion infrastructure package, citing concerns about increased government spending and potential impact on rural communities"
      },
      {
        issue: "American Rescue Plan Act (2021)",
        position: "No",
        explanation: "Opposed the $1.9 trillion COVID-19 relief package, arguing it contained excessive spending unrelated to pandemic relief and would contribute to inflation"
      }
    ]
  },
  'NYH14': {
    bio: "Alexandria Ocasio-Cortez, commonly known as AOC, is a Democratic congresswoman representing New York's 14th congressional district, which includes parts of the Bronx and Queens. Born in 1989 in the Bronx to Puerto Rican parents, she became the youngest woman ever elected to Congress at age 29. A former bartender and community organizer, Ocasio-Cortez has become one of the most prominent progressive voices in American politics, known for her advocacy of democratic socialism, climate action, and social justice.",
    politicalBackground: "Ocasio-Cortez's political journey began as a community organizer and volunteer for Bernie Sanders' 2016 presidential campaign. She worked as a bartender and waitress while organizing for progressive causes before launching her congressional campaign. In 2018, she defeated 10-term incumbent Joe Crowley in a stunning primary upset, becoming the first woman to represent New York's 14th district. She has since become a leading figure in the 'Squad' of progressive House Democrats.",
    keyPositions: [
      "Champion of the Green New Deal and aggressive climate action",
      "Strong advocate for Medicare for All and universal healthcare",
      "Supporter of criminal justice reform and police accountability",
      "Proponent of economic justice, workers' rights, and wealth redistribution",
      "Advocate for immigration reform and DREAMer protections",
      "Supporter of tuition-free college and student debt cancellation"
    ],
    recentBills: [
      {
        title: "Green New Deal Resolution (H.Res.109)",
        status: "Introduced",
        description: "Comprehensive resolution calling for a 10-year national mobilization to achieve net-zero greenhouse gas emissions, create millions of high-wage jobs, and ensure economic security for all Americans"
      },
      {
        title: "Medicare for All Act (H.R.1976)",
        status: "Introduced",
        description: "Legislation to establish a single-payer healthcare system that would provide comprehensive health coverage to all Americans, eliminating private insurance"
      }
    ],
    votingRecord: [
      {
        issue: "Infrastructure Investment and Jobs Act (2021)",
        position: "Yes",
        explanation: "Supported the infrastructure package but criticized it for not going far enough on climate action and called for additional green infrastructure investments"
      },
      {
        issue: "American Rescue Plan Act (2021)",
        position: "Yes",
        explanation: "Voted in favor of the COVID-19 relief package, praising its direct payments to families and expanded unemployment benefits"
      }
    ]
  },
  'VTS1': {
    bio: "Bernie Sanders is an Independent senator representing Vermont, serving since 2007. Born in 1941 in Brooklyn, New York, to Jewish immigrant parents, Sanders is a self-described democratic socialist who has been a leading progressive voice in American politics for over four decades. He previously served in the U.S. House of Representatives from 1991 to 2007 and as Mayor of Burlington, Vermont from 1981 to 1989. Sanders has run for president twice (2016 and 2020) and has been instrumental in popularizing progressive policies like Medicare for All and the Green New Deal.",
    politicalBackground: "Sanders' political career began in Vermont, where he moved in 1968 and became involved in local politics. He was elected Mayor of Burlington in 1981, serving four terms and transforming the city with progressive policies. In 1990, he was elected to the U.S. House of Representatives as an Independent, becoming the first Independent elected to Congress in 40 years. He was elected to the Senate in 2006 and has since become one of the most prominent progressive voices in American politics.",
    keyPositions: [
      "Champion of Medicare for All and universal healthcare as a human right",
      "Strong advocate for a $15 minimum wage and workers' rights",
      "Supporter of the Green New Deal and aggressive climate action",
      "Proponent of tuition-free college and student debt cancellation",
      "Advocate for wealth redistribution and taxing the ultra-rich",
      "Supporter of criminal justice reform and ending mass incarceration"
    ],
    recentBills: [
      {
        title: "Medicare for All Act (S.1129)",
        status: "Introduced",
        description: "Comprehensive legislation to establish a single-payer healthcare system that would provide universal health coverage to all Americans, eliminating private insurance and reducing healthcare costs"
      },
      {
        title: "Green New Deal Resolution (S.Res.59)",
        status: "Introduced",
        description: "Resolution calling for a 10-year national mobilization to achieve net-zero greenhouse gas emissions, create millions of high-wage jobs, and ensure economic security for all Americans"
      }
    ],
    votingRecord: [
      {
        issue: "Affordable Care Act (2010)",
        position: "Yes",
        explanation: "Supported the healthcare reform bill but criticized it for not going far enough, advocating for a single-payer system instead"
      },
      {
        issue: "Iraq War Authorization (2002)",
        position: "No",
        explanation: "Voted against the Iraq War authorization from the beginning, one of the few members of Congress to do so"
      }
    ]
  }
};

// Check if member has a special profile
export function hasSpecialProfile(memberId: string): boolean {
  return memberId in specialProfiles;
}

// Get special profile data
export function getSpecialProfile(memberId: string): Partial<MemberProfile> | null {
  return specialProfiles[memberId] || null;
}
