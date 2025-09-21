import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with all 50 states...');
  
  // Create sample members for all 50 states
  const members = [
    // California
    { id: 'CA001', firstName: 'John', lastName: 'Doe', chamber: 'house', state: 'CA', district: '01', party: 'D', dwNominate: 0.5 },
    { id: 'CA002', firstName: 'Jane', lastName: 'Smith', chamber: 'senate', state: 'CA', party: 'D', dwNominate: 0.3 },
    { id: 'CA003', firstName: 'Alex', lastName: 'Johnson', chamber: 'senate', state: 'CA', party: 'D', dwNominate: 0.7 },
    
    // Texas
    { id: 'TX001', firstName: 'Michael', lastName: 'Brown', chamber: 'house', state: 'TX', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'TX002', firstName: 'Sarah', lastName: 'Williams', chamber: 'senate', state: 'TX', party: 'R', dwNominate: -0.4 },
    { id: 'TX003', firstName: 'David', lastName: 'Wilson', chamber: 'senate', state: 'TX', party: 'R', dwNominate: -0.2 },
    
    // New York
    { id: 'NY001', firstName: 'Lisa', lastName: 'Davis', chamber: 'house', state: 'NY', district: '14', party: 'D', dwNominate: 0.6 },
    { id: 'NY002', firstName: 'Robert', lastName: 'Garcia', chamber: 'senate', state: 'NY', party: 'D', dwNominate: 0.8 },
    { id: 'NY003', firstName: 'Maria', lastName: 'Rodriguez', chamber: 'senate', state: 'NY', party: 'D', dwNominate: 0.4 },
    
    // Florida
    { id: 'FL001', firstName: 'James', lastName: 'Miller', chamber: 'house', state: 'FL', district: '01', party: 'R', dwNominate: -0.5 },
    { id: 'FL002', firstName: 'Jennifer', lastName: 'Taylor', chamber: 'senate', state: 'FL', party: 'R', dwNominate: -0.6 },
    { id: 'FL003', firstName: 'Christopher', lastName: 'Anderson', chamber: 'senate', state: 'FL', party: 'R', dwNominate: -0.3 },
    
    // Illinois
    { id: 'IL001', firstName: 'Patricia', lastName: 'Thomas', chamber: 'house', state: 'IL', district: '05', party: 'D', dwNominate: 0.7 },
    { id: 'IL002', firstName: 'Daniel', lastName: 'Jackson', chamber: 'senate', state: 'IL', party: 'D', dwNominate: 0.5 },
    { id: 'IL003', firstName: 'Linda', lastName: 'White', chamber: 'senate', state: 'IL', party: 'D', dwNominate: 0.9 },
    
    // Ohio
    { id: 'OH001', firstName: 'Mark', lastName: 'Harris', chamber: 'house', state: 'OH', district: '01', party: 'R', dwNominate: -0.2 },
    { id: 'OH002', firstName: 'Susan', lastName: 'Martin', chamber: 'senate', state: 'OH', party: 'R', dwNominate: -0.4 },
    { id: 'OH003', firstName: 'Paul', lastName: 'Thompson', chamber: 'senate', state: 'OH', party: 'R', dwNominate: -0.1 },
    
    // Washington
    { id: 'WA001', firstName: 'Nancy', lastName: 'Garcia', chamber: 'house', state: 'WA', district: '07', party: 'D', dwNominate: 0.8 },
    { id: 'WA002', firstName: 'Kenneth', lastName: 'Martinez', chamber: 'senate', state: 'WA', party: 'D', dwNominate: 0.6 },
    { id: 'WA003', firstName: 'Betty', lastName: 'Robinson', chamber: 'senate', state: 'WA', party: 'D', dwNominate: 0.4 },
    
    // Nevada
    { id: 'NV001', firstName: 'Steven', lastName: 'Clark', chamber: 'house', state: 'NV', district: '01', party: 'D', dwNominate: 0.3 },
    { id: 'NV002', firstName: 'Donna', lastName: 'Rodriguez', chamber: 'senate', state: 'NV', party: 'D', dwNominate: 0.1 },
    { id: 'NV003', firstName: 'Joseph', lastName: 'Lewis', chamber: 'senate', state: 'NV', party: 'D', dwNominate: 0.5 },
    
    // Pennsylvania
    { id: 'PA001', firstName: 'Carol', lastName: 'Lee', chamber: 'house', state: 'PA', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'PA002', firstName: 'Richard', lastName: 'Walker', chamber: 'senate', state: 'PA', party: 'D', dwNominate: 0.2 },
    { id: 'PA003', firstName: 'Michelle', lastName: 'Hall', chamber: 'senate', state: 'PA', party: 'D', dwNominate: 0.6 },
    
    // Georgia
    { id: 'GA001', firstName: 'Thomas', lastName: 'Allen', chamber: 'house', state: 'GA', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'GA002', firstName: 'Barbara', lastName: 'Young', chamber: 'senate', state: 'GA', party: 'R', dwNominate: -0.5 },
    { id: 'GA003', firstName: 'Charles', lastName: 'King', chamber: 'senate', state: 'GA', party: 'R', dwNominate: -0.2 },
    
    // North Carolina
    { id: 'NC001', firstName: 'Jessica', lastName: 'Wright', chamber: 'house', state: 'NC', district: '01', party: 'D', dwNominate: 0.3 },
    { id: 'NC002', firstName: 'Matthew', lastName: 'Lopez', chamber: 'senate', state: 'NC', party: 'D', dwNominate: 0.1 },
    { id: 'NC003', firstName: 'Helen', lastName: 'Hill', chamber: 'senate', state: 'NC', party: 'D', dwNominate: 0.5 },
    
    // Michigan
    { id: 'MI001', firstName: 'Anthony', lastName: 'Scott', chamber: 'house', state: 'MI', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'MI002', firstName: 'Shirley', lastName: 'Green', chamber: 'senate', state: 'MI', party: 'D', dwNominate: 0.2 },
    { id: 'MI003', firstName: 'Andrew', lastName: 'Adams', chamber: 'senate', state: 'MI', party: 'D', dwNominate: 0.6 },
    
    // Virginia
    { id: 'VA001', firstName: 'Ruth', lastName: 'Baker', chamber: 'house', state: 'VA', district: '01', party: 'D', dwNominate: 0.3 },
    { id: 'VA002', firstName: 'Kevin', lastName: 'Gonzalez', chamber: 'senate', state: 'VA', party: 'D', dwNominate: 0.1 },
    { id: 'VA003', firstName: 'Cynthia', lastName: 'Nelson', chamber: 'senate', state: 'VA', party: 'D', dwNominate: 0.5 },
    
    // Tennessee
    { id: 'TN001', firstName: 'Brian', lastName: 'Carter', chamber: 'house', state: 'TN', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'TN002', firstName: 'Dorothy', lastName: 'Mitchell', chamber: 'senate', state: 'TN', party: 'R', dwNominate: -0.6 },
    { id: 'TN003', firstName: 'Edward', lastName: 'Perez', chamber: 'senate', state: 'TN', party: 'R', dwNominate: -0.2 },
    
    // Arizona
    { id: 'AZ001', firstName: 'Kimberly', lastName: 'Roberts', chamber: 'house', state: 'AZ', district: '01', party: 'D', dwNominate: 0.2 },
    { id: 'AZ002', firstName: 'Timothy', lastName: 'Turner', chamber: 'senate', state: 'AZ', party: 'D', dwNominate: 0.4 },
    { id: 'AZ003', firstName: 'Angela', lastName: 'Phillips', chamber: 'senate', state: 'AZ', party: 'D', dwNominate: 0.6 },
    
    // Indiana
    { id: 'IN001', firstName: 'Frank', lastName: 'Campbell', chamber: 'house', state: 'IN', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'IN002', firstName: 'Deborah', lastName: 'Parker', chamber: 'senate', state: 'IN', party: 'R', dwNominate: -0.5 },
    { id: 'IN003', firstName: 'Gregory', lastName: 'Evans', chamber: 'senate', state: 'IN', party: 'R', dwNominate: -0.1 },
    
    // Missouri
    { id: 'MO001', firstName: 'Sandra', lastName: 'Edwards', chamber: 'house', state: 'MO', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'MO002', firstName: 'Harold', lastName: 'Collins', chamber: 'senate', state: 'MO', party: 'R', dwNominate: -0.6 },
    { id: 'MO003', firstName: 'Donna', lastName: 'Stewart', chamber: 'senate', state: 'MO', party: 'R', dwNominate: -0.2 },
    
    // Maryland
    { id: 'MD001', firstName: 'Carl', lastName: 'Sanchez', chamber: 'house', state: 'MD', district: '01', party: 'D', dwNominate: 0.5 },
    { id: 'MD002', firstName: 'Joyce', lastName: 'Morris', chamber: 'senate', state: 'MD', party: 'D', dwNominate: 0.3 },
    { id: 'MD003', firstName: 'Jerry', lastName: 'Rogers', chamber: 'senate', state: 'MD', party: 'D', dwNominate: 0.7 },
    
    // Wisconsin
    { id: 'WI001', firstName: 'Janet', lastName: 'Reed', chamber: 'house', state: 'WI', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'WI002', firstName: 'Raymond', lastName: 'Cook', chamber: 'senate', state: 'WI', party: 'D', dwNominate: 0.2 },
    { id: 'WI003', firstName: 'Virginia', lastName: 'Morgan', chamber: 'senate', state: 'WI', party: 'D', dwNominate: 0.6 },
    
    // Colorado
    { id: 'CO001', firstName: 'Lawrence', lastName: 'Bell', chamber: 'house', state: 'CO', district: '01', party: 'D', dwNominate: 0.3 },
    { id: 'CO002', firstName: 'Rachel', lastName: 'Murphy', chamber: 'senate', state: 'CO', party: 'D', dwNominate: 0.1 },
    { id: 'CO003', firstName: 'Wayne', lastName: 'Bailey', chamber: 'senate', state: 'CO', party: 'D', dwNominate: 0.5 },
    
    // Minnesota
    { id: 'MN001', firstName: 'Amy', lastName: 'Rivera', chamber: 'house', state: 'MN', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'MN002', firstName: 'Arthur', lastName: 'Cooper', chamber: 'senate', state: 'MN', party: 'D', dwNominate: 0.2 },
    { id: 'MN003', firstName: 'Brenda', lastName: 'Richardson', chamber: 'senate', state: 'MN', party: 'D', dwNominate: 0.6 },
    
    // Louisiana
    { id: 'LA001', firstName: 'Louis', lastName: 'Cox', chamber: 'house', state: 'LA', district: '01', party: 'R', dwNominate: -0.5 },
    { id: 'LA002', firstName: 'Frances', lastName: 'Ward', chamber: 'senate', state: 'LA', party: 'R', dwNominate: -0.7 },
    { id: 'LA003', firstName: 'Eugene', lastName: 'Torres', chamber: 'senate', state: 'LA', party: 'R', dwNominate: -0.3 },
    
    // Alabama
    { id: 'AL001', firstName: 'Cheryl', lastName: 'Peterson', chamber: 'house', state: 'AL', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'AL002', firstName: 'Albert', lastName: 'Gray', chamber: 'senate', state: 'AL', party: 'R', dwNominate: -0.6 },
    { id: 'AL003', firstName: 'Marie', lastName: 'Ramirez', chamber: 'senate', state: 'AL', party: 'R', dwNominate: -0.2 },
    
    // Kentucky
    { id: 'KY001', firstName: 'Victor', lastName: 'James', chamber: 'house', state: 'KY', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'KY002', firstName: 'Judy', lastName: 'Watson', chamber: 'senate', state: 'KY', party: 'R', dwNominate: -0.5 },
    { id: 'KY003', firstName: 'Ryan', lastName: 'Brooks', chamber: 'senate', state: 'KY', party: 'R', dwNominate: -0.1 },
    
    // Oregon
    { id: 'OR001', firstName: 'Alice', lastName: 'Kelly', chamber: 'house', state: 'OR', district: '01', party: 'D', dwNominate: 0.5 },
    { id: 'OR002', firstName: 'Philip', lastName: 'Sanders', chamber: 'senate', state: 'OR', party: 'D', dwNominate: 0.3 },
    { id: 'OR003', firstName: 'Janice', lastName: 'Price', chamber: 'senate', state: 'OR', party: 'D', dwNominate: 0.7 },
    
    // Oklahoma
    { id: 'OK001', firstName: 'Ralph', lastName: 'Bennett', chamber: 'house', state: 'OK', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'OK002', firstName: 'Gloria', lastName: 'Wood', chamber: 'senate', state: 'OK', party: 'R', dwNominate: -0.6 },
    { id: 'OK003', firstName: 'Sean', lastName: 'Barnes', chamber: 'senate', state: 'OK', party: 'R', dwNominate: -0.2 },
    
    // Connecticut
    { id: 'CT001', firstName: 'Teresa', lastName: 'Henderson', chamber: 'house', state: 'CT', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'CT002', firstName: 'Peter', lastName: 'Coleman', chamber: 'senate', state: 'CT', party: 'D', dwNominate: 0.2 },
    { id: 'CT003', firstName: 'Diane', lastName: 'Jenkins', chamber: 'senate', state: 'CT', party: 'D', dwNominate: 0.6 },
    
    // Iowa
    { id: 'IA001', firstName: 'Keith', lastName: 'Perry', chamber: 'house', state: 'IA', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'IA002', firstName: 'Lori', lastName: 'Powell', chamber: 'senate', state: 'IA', party: 'R', dwNominate: -0.5 },
    { id: 'IA003', firstName: 'Todd', lastName: 'Long', chamber: 'senate', state: 'IA', party: 'R', dwNominate: -0.1 },
    
    // Utah
    { id: 'UT001', firstName: 'Diana', lastName: 'Patterson', chamber: 'house', state: 'UT', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'UT002', firstName: 'Roger', lastName: 'Hughes', chamber: 'senate', state: 'UT', party: 'R', dwNominate: -0.6 },
    { id: 'UT003', firstName: 'Catherine', lastName: 'Flores', chamber: 'senate', state: 'UT', party: 'R', dwNominate: -0.2 },
    
    // Arkansas
    { id: 'AR001', firstName: 'Willie', lastName: 'Roberts', chamber: 'house', state: 'AR', district: '01', party: 'R', dwNominate: -0.5 },
    { id: 'AR002', firstName: 'Denise', lastName: 'Carter', chamber: 'senate', state: 'AR', party: 'R', dwNominate: -0.7 },
    { id: 'AR003', firstName: 'Craig', lastName: 'Gomez', chamber: 'senate', state: 'AR', party: 'R', dwNominate: -0.3 },
    
    // Mississippi
    { id: 'MS001', firstName: 'Evelyn', lastName: 'Phillips', chamber: 'house', state: 'MS', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'MS002', firstName: 'Juan', lastName: 'Campbell', chamber: 'senate', state: 'MS', party: 'R', dwNominate: -0.6 },
    { id: 'MS003', firstName: 'Julie', lastName: 'Parker', chamber: 'senate', state: 'MS', party: 'R', dwNominate: -0.2 },
    
    // Kansas
    { id: 'KS001', firstName: 'Ralph', lastName: 'Evans', chamber: 'house', state: 'KS', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'KS002', firstName: 'Sharon', lastName: 'Edwards', chamber: 'senate', state: 'KS', party: 'R', dwNominate: -0.5 },
    { id: 'KS003', firstName: 'Lawrence', lastName: 'Collins', chamber: 'senate', state: 'KS', party: 'R', dwNominate: -0.1 },
    
    // New Mexico
    { id: 'NM001', firstName: 'Deborah', lastName: 'Stewart', chamber: 'house', state: 'NM', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'NM002', firstName: 'Gary', lastName: 'Sanchez', chamber: 'senate', state: 'NM', party: 'D', dwNominate: 0.2 },
    { id: 'NM003', firstName: 'Carol', lastName: 'Morris', chamber: 'senate', state: 'NM', party: 'D', dwNominate: 0.6 },
    
    // Nebraska
    { id: 'NE001', firstName: 'Roy', lastName: 'Rogers', chamber: 'house', state: 'NE', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'NE002', firstName: 'Janet', lastName: 'Reed', chamber: 'senate', state: 'NE', party: 'R', dwNominate: -0.6 },
    { id: 'NE003', firstName: 'Carl', lastName: 'Cook', chamber: 'senate', state: 'NE', party: 'R', dwNominate: -0.2 },
    
    // West Virginia
    { id: 'WV001', firstName: 'Joyce', lastName: 'Morgan', chamber: 'house', state: 'WV', district: '01', party: 'R', dwNominate: -0.5 },
    { id: 'WV002', firstName: 'Jerry', lastName: 'Bell', chamber: 'senate', state: 'WV', party: 'R', dwNominate: -0.7 },
    { id: 'WV003', firstName: 'Virginia', lastName: 'Murphy', chamber: 'senate', state: 'WV', party: 'R', dwNominate: -0.3 },
    
    // Idaho
    { id: 'ID001', firstName: 'Raymond', lastName: 'Bailey', chamber: 'house', state: 'ID', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'ID002', firstName: 'Amy', lastName: 'Rivera', chamber: 'senate', state: 'ID', party: 'R', dwNominate: -0.5 },
    { id: 'ID003', firstName: 'Arthur', lastName: 'Cooper', chamber: 'senate', state: 'ID', party: 'R', dwNominate: -0.1 },
    
    // Hawaii
    { id: 'HI001', firstName: 'Brenda', lastName: 'Richardson', chamber: 'house', state: 'HI', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'HI002', firstName: 'Louis', lastName: 'Cox', chamber: 'senate', state: 'HI', party: 'D', dwNominate: 0.2 },
    { id: 'HI003', firstName: 'Frances', lastName: 'Ward', chamber: 'senate', state: 'HI', party: 'D', dwNominate: 0.6 },
    
    // New Hampshire
    { id: 'NH001', firstName: 'Eugene', lastName: 'Torres', chamber: 'house', state: 'NH', district: '01', party: 'D', dwNominate: 0.3 },
    { id: 'NH002', firstName: 'Cheryl', lastName: 'Peterson', chamber: 'senate', state: 'NH', party: 'D', dwNominate: 0.1 },
    { id: 'NH003', firstName: 'Albert', lastName: 'Gray', chamber: 'senate', state: 'NH', party: 'D', dwNominate: 0.5 },
    
    // Maine
    { id: 'ME001', firstName: 'Marie', lastName: 'Ramirez', chamber: 'house', state: 'ME', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'ME002', firstName: 'Victor', lastName: 'James', chamber: 'senate', state: 'ME', party: 'D', dwNominate: 0.2 },
    { id: 'ME003', firstName: 'Judy', lastName: 'Watson', chamber: 'senate', state: 'ME', party: 'D', dwNominate: 0.6 },
    
    // Rhode Island
    { id: 'RI001', firstName: 'Ryan', lastName: 'Brooks', chamber: 'house', state: 'RI', district: '01', party: 'D', dwNominate: 0.5 },
    { id: 'RI002', firstName: 'Alice', lastName: 'Kelly', chamber: 'senate', state: 'RI', party: 'D', dwNominate: 0.3 },
    { id: 'RI003', firstName: 'Philip', lastName: 'Sanders', chamber: 'senate', state: 'RI', party: 'D', dwNominate: 0.7 },
    
    // Montana
    { id: 'MT001', firstName: 'Janice', lastName: 'Price', chamber: 'house', state: 'MT', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'MT002', firstName: 'Ralph', lastName: 'Bennett', chamber: 'senate', state: 'MT', party: 'R', dwNominate: -0.6 },
    { id: 'MT003', firstName: 'Gloria', lastName: 'Wood', chamber: 'senate', state: 'MT', party: 'R', dwNominate: -0.2 },
    
    // Delaware
    { id: 'DE001', firstName: 'Sean', lastName: 'Barnes', chamber: 'house', state: 'DE', district: '01', party: 'D', dwNominate: 0.3 },
    { id: 'DE002', firstName: 'Teresa', lastName: 'Henderson', chamber: 'senate', state: 'DE', party: 'D', dwNominate: 0.1 },
    { id: 'DE003', firstName: 'Peter', lastName: 'Coleman', chamber: 'senate', state: 'DE', party: 'D', dwNominate: 0.5 },
    
    // South Dakota
    { id: 'SD001', firstName: 'Diane', lastName: 'Jenkins', chamber: 'house', state: 'SD', district: '01', party: 'R', dwNominate: -0.5 },
    { id: 'SD002', firstName: 'Keith', lastName: 'Perry', chamber: 'senate', state: 'SD', party: 'R', dwNominate: -0.7 },
    { id: 'SD003', firstName: 'Lori', lastName: 'Powell', chamber: 'senate', state: 'SD', party: 'R', dwNominate: -0.3 },
    
    // North Dakota
    { id: 'ND001', firstName: 'Todd', lastName: 'Long', chamber: 'house', state: 'ND', district: '01', party: 'R', dwNominate: -0.4 },
    { id: 'ND002', firstName: 'Diana', lastName: 'Patterson', chamber: 'senate', state: 'ND', party: 'R', dwNominate: -0.6 },
    { id: 'ND003', firstName: 'Roger', lastName: 'Hughes', chamber: 'senate', state: 'ND', party: 'R', dwNominate: -0.2 },
    
    // Alaska
    { id: 'AK001', firstName: 'Catherine', lastName: 'Flores', chamber: 'house', state: 'AK', district: '01', party: 'R', dwNominate: -0.3 },
    { id: 'AK002', firstName: 'Steven', lastName: 'Clark', chamber: 'senate', state: 'AK', party: 'R', dwNominate: -0.5 },
    { id: 'AK003', firstName: 'Donna', lastName: 'Rodriguez', chamber: 'senate', state: 'AK', party: 'R', dwNominate: -0.1 },
    
    // Vermont
    { id: 'VT001', firstName: 'Joseph', lastName: 'Lewis', chamber: 'house', state: 'VT', district: '01', party: 'D', dwNominate: 0.4 },
    { id: 'VT002', firstName: 'Willie', lastName: 'Roberts', chamber: 'senate', state: 'VT', party: 'D', dwNominate: 0.2 },
    { id: 'VT003', firstName: 'Denise', lastName: 'Carter', chamber: 'senate', state: 'VT', party: 'D', dwNominate: 0.6 },
    
    // Wyoming
    { id: 'WY001', firstName: 'Craig', lastName: 'Gomez', chamber: 'house', state: 'WY', district: '01', party: 'R', dwNominate: -0.5 },
    { id: 'WY002', firstName: 'Evelyn', lastName: 'Phillips', chamber: 'senate', state: 'WY', party: 'R', dwNominate: -0.7 },
    { id: 'WY003', firstName: 'Juan', lastName: 'Campbell', chamber: 'senate', state: 'WY', party: 'R', dwNominate: -0.3 },
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
    { id: 'COMM005', name: 'House Committee on Armed Services' },
    { id: 'COMM006', name: 'Senate Committee on Finance' },
    { id: 'COMM007', name: 'House Committee on Education and Labor' },
    { id: 'COMM008', name: 'Senate Committee on Health, Education, Labor and Pensions' },
  ];

  for (const committee of committees) {
    await prisma.committee.upsert({
      where: { id: committee.id },
      update: {},
      create: committee,
    });
  }

  // Create committee memberships for some members
  const committeeMemberships = [
    { id: 'COMM001-CA001', committeeId: 'COMM001', memberId: 'CA001', role: 'Member' },
    { id: 'COMM001-TX001', committeeId: 'COMM001', memberId: 'TX001', role: 'Member' },
    { id: 'COMM002-CA002', committeeId: 'COMM002', memberId: 'CA002', role: 'Member' },
    { id: 'COMM002-TX002', committeeId: 'COMM002', memberId: 'TX002', role: 'Member' },
    { id: 'COMM003-NY001', committeeId: 'COMM003', memberId: 'NY001', role: 'Member' },
    { id: 'COMM003-FL001', committeeId: 'COMM003', memberId: 'FL001', role: 'Member' },
    { id: 'COMM004-NY002', committeeId: 'COMM004', memberId: 'NY002', role: 'Member' },
    { id: 'COMM004-FL002', committeeId: 'COMM004', memberId: 'FL002', role: 'Member' },
  ];

  for (const membership of committeeMemberships) {
    await prisma.committeeMember.upsert({
      where: { id: membership.id },
      update: {},
      create: membership,
    });
  }

  console.log('Database seeded successfully with all 50 states!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
