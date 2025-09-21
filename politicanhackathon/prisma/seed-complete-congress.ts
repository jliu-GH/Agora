import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// House districts by state (2020 census apportionment)
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

// Real congressional data - sample of actual members
const realMembers = [
  // California (52 House + 2 Senate)
  { id: 'CAH01', firstName: 'Doug', lastName: 'LaMalfa', chamber: 'house', state: 'CA', district: '01', party: 'R' },
  { id: 'CAH02', firstName: 'Jared', lastName: 'Huffman', chamber: 'house', state: 'CA', district: '02', party: 'D' },
  { id: 'CAH03', firstName: 'Kevin', lastName: 'Kiley', chamber: 'house', state: 'CA', district: '03', party: 'R' },
  { id: 'CAH04', firstName: 'Mike', lastName: 'Thompson', chamber: 'house', state: 'CA', district: '04', party: 'D' },
  { id: 'CAH05', firstName: 'Tom', lastName: 'McClintock', chamber: 'house', state: 'CA', district: '05', party: 'R' },
  { id: 'CAH06', firstName: 'Ami', lastName: 'Bera', chamber: 'house', state: 'CA', district: '06', party: 'D' },
  { id: 'CAH07', firstName: 'Doris', lastName: 'Matsui', chamber: 'house', state: 'CA', district: '07', party: 'D' },
  { id: 'CAH08', firstName: 'John', lastName: 'Garamendi', chamber: 'house', state: 'CA', district: '08', party: 'D' },
  { id: 'CAH09', firstName: 'Josh', lastName: 'Harder', chamber: 'house', state: 'CA', district: '09', party: 'D' },
  { id: 'CAH10', firstName: 'Mark', lastName: 'DeSaulnier', chamber: 'house', state: 'CA', district: '10', party: 'D' },
  { id: 'CAH11', firstName: 'Nancy', lastName: 'Pelosi', chamber: 'house', state: 'CA', district: '11', party: 'D' },
  { id: 'CAH12', firstName: 'Barbara', lastName: 'Lee', chamber: 'house', state: 'CA', district: '12', party: 'D' },
  { id: 'CAH13', firstName: 'John', lastName: 'Duarte', chamber: 'house', state: 'CA', district: '13', party: 'R' },
  { id: 'CAH14', firstName: 'Eric', lastName: 'Swalwell', chamber: 'house', state: 'CA', district: '14', party: 'D' },
  { id: 'CAH15', firstName: 'Kevin', lastName: 'Mullin', chamber: 'house', state: 'CA', district: '15', party: 'D' },
  { id: 'CAH16', firstName: 'Anna', lastName: 'Eshoo', chamber: 'house', state: 'CA', district: '16', party: 'D' },
  { id: 'CAH17', firstName: 'Ro', lastName: 'Khanna', chamber: 'house', state: 'CA', district: '17', party: 'D' },
  { id: 'CAH18', firstName: 'Zoe', lastName: 'Lofgren', chamber: 'house', state: 'CA', district: '18', party: 'D' },
  { id: 'CAH19', firstName: 'Jimmy', lastName: 'Panetta', chamber: 'house', state: 'CA', district: '19', party: 'D' },
  { id: 'CAH20', firstName: 'Kevin', lastName: 'McCarthy', chamber: 'house', state: 'CA', district: '20', party: 'R' },
  { id: 'CAH21', firstName: 'Jim', lastName: 'Costa', chamber: 'house', state: 'CA', district: '21', party: 'D' },
  { id: 'CAH22', firstName: 'David', lastName: 'Valadao', chamber: 'house', state: 'CA', district: '22', party: 'R' },
  { id: 'CAH23', firstName: 'Jay', lastName: 'Obernolte', chamber: 'house', state: 'CA', district: '23', party: 'R' },
  { id: 'CAH24', firstName: 'Salud', lastName: 'Carbajal', chamber: 'house', state: 'CA', district: '24', party: 'D' },
  { id: 'CAH25', firstName: 'Raul', lastName: 'Ruiz', chamber: 'house', state: 'CA', district: '25', party: 'D' },
  { id: 'CAH26', firstName: 'Julia', lastName: 'Brownley', chamber: 'house', state: 'CA', district: '26', party: 'D' },
  { id: 'CAH27', firstName: 'Mike', lastName: 'Garcia', chamber: 'house', state: 'CA', district: '27', party: 'R' },
  { id: 'CAH28', firstName: 'Judy', lastName: 'Chu', chamber: 'house', state: 'CA', district: '28', party: 'D' },
  { id: 'CAH29', firstName: 'Tony', lastName: 'Cárdenas', chamber: 'house', state: 'CA', district: '29', party: 'D' },
  { id: 'CAH30', firstName: 'Adam', lastName: 'Schiff', chamber: 'house', state: 'CA', district: '30', party: 'D' },
  { id: 'CAH31', firstName: 'Grace', lastName: 'Napolitano', chamber: 'house', state: 'CA', district: '31', party: 'D' },
  { id: 'CAH32', firstName: 'Brad', lastName: 'Sherman', chamber: 'house', state: 'CA', district: '32', party: 'D' },
  { id: 'CAH33', firstName: 'Pete', lastName: 'Aguilar', chamber: 'house', state: 'CA', district: '33', party: 'D' },
  { id: 'CAH34', firstName: 'Jimmy', lastName: 'Gomez', chamber: 'house', state: 'CA', district: '34', party: 'D' },
  { id: 'CAH35', firstName: 'Norma', lastName: 'Torres', chamber: 'house', state: 'CA', district: '35', party: 'D' },
  { id: 'CAH36', firstName: 'Ted', lastName: 'Lieu', chamber: 'house', state: 'CA', district: '36', party: 'D' },
  { id: 'CAH37', firstName: 'Sydney', lastName: 'Kamlager-Dove', chamber: 'house', state: 'CA', district: '37', party: 'D' },
  { id: 'CAH38', firstName: 'Linda', lastName: 'Sánchez', chamber: 'house', state: 'CA', district: '38', party: 'D' },
  { id: 'CAH39', firstName: 'Mark', lastName: 'Takano', chamber: 'house', state: 'CA', district: '39', party: 'D' },
  { id: 'CAH40', firstName: 'Young', lastName: 'Kim', chamber: 'house', state: 'CA', district: '40', party: 'R' },
  { id: 'CAH41', firstName: 'Ken', lastName: 'Calvert', chamber: 'house', state: 'CA', district: '41', party: 'R' },
  { id: 'CAH42', firstName: 'Robert', lastName: 'Garcia', chamber: 'house', state: 'CA', district: '42', party: 'D' },
  { id: 'CAH43', firstName: 'Maxine', lastName: 'Waters', chamber: 'house', state: 'CA', district: '43', party: 'D' },
  { id: 'CAH44', firstName: 'Nanette', lastName: 'Barragán', chamber: 'house', state: 'CA', district: '44', party: 'D' },
  { id: 'CAH45', firstName: 'Michelle', lastName: 'Steel', chamber: 'house', state: 'CA', district: '45', party: 'R' },
  { id: 'CAH46', firstName: 'Lou', lastName: 'Correa', chamber: 'house', state: 'CA', district: '46', party: 'D' },
  { id: 'CAH47', firstName: 'Katie', lastName: 'Porter', chamber: 'house', state: 'CA', district: '47', party: 'D' },
  { id: 'CAH48', firstName: 'Darrell', lastName: 'Issa', chamber: 'house', state: 'CA', district: '48', party: 'R' },
  { id: 'CAH49', firstName: 'Mike', lastName: 'Levin', chamber: 'house', state: 'CA', district: '49', party: 'D' },
  { id: 'CAH50', firstName: 'Scott', lastName: 'Peters', chamber: 'house', state: 'CA', district: '50', party: 'D' },
  { id: 'CAH51', firstName: 'Sara', lastName: 'Jacobs', chamber: 'house', state: 'CA', district: '51', party: 'D' },
  { id: 'CAH52', firstName: 'Juan', lastName: 'Vargas', chamber: 'house', state: 'CA', district: '52', party: 'D' },
  { id: 'CAS1', firstName: 'Dianne', lastName: 'Feinstein', chamber: 'senate', state: 'CA', party: 'D' },
  { id: 'CAS2', firstName: 'Alex', lastName: 'Padilla', chamber: 'senate', state: 'CA', party: 'D' },

  // Texas (38 House + 2 Senate)
  { id: 'TXH01', firstName: 'Nathaniel', lastName: 'Moran', chamber: 'house', state: 'TX', district: '01', party: 'R' },
  { id: 'TXH02', firstName: 'Dan', lastName: 'Crenshaw', chamber: 'house', state: 'TX', district: '02', party: 'R' },
  { id: 'TXH03', firstName: 'Keith', lastName: 'Self', chamber: 'house', state: 'TX', district: '03', party: 'R' },
  { id: 'TXH04', firstName: 'Pat', lastName: 'Fallon', chamber: 'house', state: 'TX', district: '04', party: 'R' },
  { id: 'TXH05', firstName: 'Lance', lastName: 'Gooden', chamber: 'house', state: 'TX', district: '05', party: 'R' },
  { id: 'TXH06', firstName: 'Jake', lastName: 'Ellzey', chamber: 'house', state: 'TX', district: '06', party: 'R' },
  { id: 'TXH07', firstName: 'Lizzie', lastName: 'Fletcher', chamber: 'house', state: 'TX', district: '07', party: 'D' },
  { id: 'TXH08', firstName: 'Morgan', lastName: 'Luttrell', chamber: 'house', state: 'TX', district: '08', party: 'R' },
  { id: 'TXH09', firstName: 'Al', lastName: 'Green', chamber: 'house', state: 'TX', district: '09', party: 'D' },
  { id: 'TXH10', firstName: 'Michael', lastName: 'McCaul', chamber: 'house', state: 'TX', district: '10', party: 'R' },
  { id: 'TXH11', firstName: 'August', lastName: 'Pfluger', chamber: 'house', state: 'TX', district: '11', party: 'R' },
  { id: 'TXH12', firstName: 'Kay', lastName: 'Granger', chamber: 'house', state: 'TX', district: '12', party: 'R' },
  { id: 'TXH13', firstName: 'Ronny', lastName: 'Jackson', chamber: 'house', state: 'TX', district: '13', party: 'R' },
  { id: 'TXH14', firstName: 'Randy', lastName: 'Weber', chamber: 'house', state: 'TX', district: '14', party: 'R' },
  { id: 'TXH15', firstName: 'Monica', lastName: 'De La Cruz', chamber: 'house', state: 'TX', district: '15', party: 'R' },
  { id: 'TXH16', firstName: 'Veronica', lastName: 'Escobar', chamber: 'house', state: 'TX', district: '16', party: 'D' },
  { id: 'TXH17', firstName: 'Pete', lastName: 'Sessions', chamber: 'house', state: 'TX', district: '17', party: 'R' },
  { id: 'TXH18', firstName: 'Sheila', lastName: 'Jackson Lee', chamber: 'house', state: 'TX', district: '18', party: 'D' },
  { id: 'TXH19', firstName: 'Jodey', lastName: 'Arrington', chamber: 'house', state: 'TX', district: '19', party: 'R' },
  { id: 'TXH20', firstName: 'Joaquin', lastName: 'Castro', chamber: 'house', state: 'TX', district: '20', party: 'D' },
  { id: 'TXH21', firstName: 'Chip', lastName: 'Roy', chamber: 'house', state: 'TX', district: '21', party: 'R' },
  { id: 'TXH22', firstName: 'Troy', lastName: 'Nehls', chamber: 'house', state: 'TX', district: '22', party: 'R' },
  { id: 'TXH23', firstName: 'Tony', lastName: 'Gonzales', chamber: 'house', state: 'TX', district: '23', party: 'R' },
  { id: 'TXH24', firstName: 'Beth', lastName: 'Van Duyne', chamber: 'house', state: 'TX', district: '24', party: 'R' },
  { id: 'TXH25', firstName: 'Roger', lastName: 'Williams', chamber: 'house', state: 'TX', district: '25', party: 'R' },
  { id: 'TXH26', firstName: 'Michael', lastName: 'Burgess', chamber: 'house', state: 'TX', district: '26', party: 'R' },
  { id: 'TXH27', firstName: 'Michael', lastName: 'Cloud', chamber: 'house', state: 'TX', district: '27', party: 'R' },
  { id: 'TXH28', firstName: 'Henry', lastName: 'Cuellar', chamber: 'house', state: 'TX', district: '28', party: 'D' },
  { id: 'TXH29', firstName: 'Sylvia', lastName: 'Garcia', chamber: 'house', state: 'TX', district: '29', party: 'D' },
  { id: 'TXH30', firstName: 'Jasmine', lastName: 'Crockett', chamber: 'house', state: 'TX', district: '30', party: 'D' },
  { id: 'TXH31', firstName: 'John', lastName: 'Carter', chamber: 'house', state: 'TX', district: '31', party: 'R' },
  { id: 'TXH32', firstName: 'Colin', lastName: 'Allred', chamber: 'house', state: 'TX', district: '32', party: 'D' },
  { id: 'TXH33', firstName: 'Marc', lastName: 'Veasey', chamber: 'house', state: 'TX', district: '33', party: 'D' },
  { id: 'TXH34', firstName: 'Vicente', lastName: 'Gonzalez', chamber: 'house', state: 'TX', district: '34', party: 'D' },
  { id: 'TXH35', firstName: 'Greg', lastName: 'Casar', chamber: 'house', state: 'TX', district: '35', party: 'D' },
  { id: 'TXH36', firstName: 'Brian', lastName: 'Babin', chamber: 'house', state: 'TX', district: '36', party: 'R' },
  { id: 'TXH37', firstName: 'Lloyd', lastName: 'Doggett', chamber: 'house', state: 'TX', district: '37', party: 'D' },
  { id: 'TXH38', firstName: 'Wesley', lastName: 'Hunt', chamber: 'house', state: 'TX', district: '38', party: 'R' },
  { id: 'TXS1', firstName: 'John', lastName: 'Cornyn', chamber: 'senate', state: 'TX', party: 'R' },
  { id: 'TXS2', firstName: 'Ted', lastName: 'Cruz', chamber: 'senate', state: 'TX', party: 'R' },

  // New York (26 House + 2 Senate)
  { id: 'NYH01', firstName: 'Nick', lastName: 'LaLota', chamber: 'house', state: 'NY', district: '01', party: 'R' },
  { id: 'NYH02', firstName: 'Andrew', lastName: 'Garbarino', chamber: 'house', state: 'NY', district: '02', party: 'R' },
  { id: 'NYH03', firstName: 'George', lastName: 'Santos', chamber: 'house', state: 'NY', district: '03', party: 'R' },
  { id: 'NYH04', firstName: 'Anthony', lastName: 'D\'Esposito', chamber: 'house', state: 'NY', district: '04', party: 'R' },
  { id: 'NYH05', firstName: 'Gregory', lastName: 'Meeks', chamber: 'house', state: 'NY', district: '05', party: 'D' },
  { id: 'NYH06', firstName: 'Grace', lastName: 'Meng', chamber: 'house', state: 'NY', district: '06', party: 'D' },
  { id: 'NYH07', firstName: 'Nydia', lastName: 'Velázquez', chamber: 'house', state: 'NY', district: '07', party: 'D' },
  { id: 'NYH08', firstName: 'Hakeem', lastName: 'Jeffries', chamber: 'house', state: 'NY', district: '08', party: 'D' },
  { id: 'NYH09', firstName: 'Yvette', lastName: 'Clarke', chamber: 'house', state: 'NY', district: '09', party: 'D' },
  { id: 'NYH10', firstName: 'Jerry', lastName: 'Nadler', chamber: 'house', state: 'NY', district: '10', party: 'D' },
  { id: 'NYH11', firstName: 'Nicole', lastName: 'Malliotakis', chamber: 'house', state: 'NY', district: '11', party: 'R' },
  { id: 'NYH12', firstName: 'Carolyn', lastName: 'Maloney', chamber: 'house', state: 'NY', district: '12', party: 'D' },
  { id: 'NYH13', firstName: 'Adriano', lastName: 'Espaillat', chamber: 'house', state: 'NY', district: '13', party: 'D' },
  { id: 'NYH14', firstName: 'Alexandria', lastName: 'Ocasio-Cortez', chamber: 'house', state: 'NY', district: '14', party: 'D' },
  { id: 'NYH15', firstName: 'Ritchie', lastName: 'Torres', chamber: 'house', state: 'NY', district: '15', party: 'D' },
  { id: 'NYH16', firstName: 'Jamaal', lastName: 'Bowman', chamber: 'house', state: 'NY', district: '16', party: 'D' },
  { id: 'NYH17', firstName: 'Mondaire', lastName: 'Jones', chamber: 'house', state: 'NY', district: '17', party: 'D' },
  { id: 'NYH18', firstName: 'Sean', lastName: 'Patrick Maloney', chamber: 'house', state: 'NY', district: '18', party: 'D' },
  { id: 'NYH19', firstName: 'Antonio', lastName: 'Delgado', chamber: 'house', state: 'NY', district: '19', party: 'D' },
  { id: 'NYH20', firstName: 'Paul', lastName: 'Tonko', chamber: 'house', state: 'NY', district: '20', party: 'D' },
  { id: 'NYH21', firstName: 'Elise', lastName: 'Stefanik', chamber: 'house', state: 'NY', district: '21', party: 'R' },
  { id: 'NYH22', firstName: 'Claudia', lastName: 'Tenney', chamber: 'house', state: 'NY', district: '22', party: 'R' },
  { id: 'NYH23', firstName: 'Tom', lastName: 'Reed', chamber: 'house', state: 'NY', district: '23', party: 'R' },
  { id: 'NYH24', firstName: 'John', lastName: 'Katko', chamber: 'house', state: 'NY', district: '24', party: 'R' },
  { id: 'NYH25', firstName: 'Joseph', lastName: 'Morelle', chamber: 'house', state: 'NY', district: '25', party: 'D' },
  { id: 'NYH26', firstName: 'Brian', lastName: 'Higgins', chamber: 'house', state: 'NY', district: '26', party: 'D' },
  { id: 'NYS1', firstName: 'Kirsten', lastName: 'Gillibrand', chamber: 'senate', state: 'NY', party: 'D' },
  { id: 'NYS2', firstName: 'Chuck', lastName: 'Schumer', chamber: 'senate', state: 'NY', party: 'D' },

  // Florida (28 House + 2 Senate)
  { id: 'FLH01', firstName: 'Matt', lastName: 'Gaetz', chamber: 'house', state: 'FL', district: '01', party: 'R' },
  { id: 'FLH02', firstName: 'Neal', lastName: 'Dunn', chamber: 'house', state: 'FL', district: '02', party: 'R' },
  { id: 'FLH03', firstName: 'Kat', lastName: 'Cammack', chamber: 'house', state: 'FL', district: '03', party: 'R' },
  { id: 'FLH04', firstName: 'Aaron', lastName: 'Bean', chamber: 'house', state: 'FL', district: '04', party: 'R' },
  { id: 'FLH05', firstName: 'John', lastName: 'Rutherford', chamber: 'house', state: 'FL', district: '05', party: 'R' },
  { id: 'FLH06', firstName: 'Michael', lastName: 'Waltz', chamber: 'house', state: 'FL', district: '06', party: 'R' },
  { id: 'FLH07', firstName: 'Cory', lastName: 'Mills', chamber: 'house', state: 'FL', district: '07', party: 'R' },
  { id: 'FLH08', firstName: 'Bill', lastName: 'Posey', chamber: 'house', state: 'FL', district: '08', party: 'R' },
  { id: 'FLH09', firstName: 'Darren', lastName: 'Soto', chamber: 'house', state: 'FL', district: '09', party: 'D' },
  { id: 'FLH10', firstName: 'Maxwell', lastName: 'Frost', chamber: 'house', state: 'FL', district: '10', party: 'D' },
  { id: 'FLH11', firstName: 'Daniel', lastName: 'Webster', chamber: 'house', state: 'FL', district: '11', party: 'R' },
  { id: 'FLH12', firstName: 'Gus', lastName: 'Bilirakis', chamber: 'house', state: 'FL', district: '12', party: 'R' },
  { id: 'FLH13', firstName: 'Anna', lastName: 'Paulina Luna', chamber: 'house', state: 'FL', district: '13', party: 'R' },
  { id: 'FLH14', firstName: 'Kathy', lastName: 'Castor', chamber: 'house', state: 'FL', district: '14', party: 'D' },
  { id: 'FLH15', firstName: 'Laurel', lastName: 'Lee', chamber: 'house', state: 'FL', district: '15', party: 'R' },
  { id: 'FLH16', firstName: 'Vern', lastName: 'Buchanan', chamber: 'house', state: 'FL', district: '16', party: 'R' },
  { id: 'FLH17', firstName: 'Greg', lastName: 'Steube', chamber: 'house', state: 'FL', district: '17', party: 'R' },
  { id: 'FLH18', firstName: 'Scott', lastName: 'Franklin', chamber: 'house', state: 'FL', district: '18', party: 'R' },
  { id: 'FLH19', firstName: 'Byron', lastName: 'Donalds', chamber: 'house', state: 'FL', district: '19', party: 'R' },
  { id: 'FLH20', firstName: 'Sheila', lastName: 'Cherfilus-McCormick', chamber: 'house', state: 'FL', district: '20', party: 'D' },
  { id: 'FLH21', firstName: 'Brian', lastName: 'Mast', chamber: 'house', state: 'FL', district: '21', party: 'R' },
  { id: 'FLH22', firstName: 'Lois', lastName: 'Frankel', chamber: 'house', state: 'FL', district: '22', party: 'D' },
  { id: 'FLH23', firstName: 'Jared', lastName: 'Moskowitz', chamber: 'house', state: 'FL', district: '23', party: 'D' },
  { id: 'FLH24', firstName: 'Frederica', lastName: 'Wilson', chamber: 'house', state: 'FL', district: '24', party: 'D' },
  { id: 'FLH25', firstName: 'Debbie', lastName: 'Wasserman Schultz', chamber: 'house', state: 'FL', district: '25', party: 'D' },
  { id: 'FLH26', firstName: 'Mario', lastName: 'Díaz-Balart', chamber: 'house', state: 'FL', district: '26', party: 'R' },
  { id: 'FLH27', firstName: 'Maria', lastName: 'Elvira Salazar', chamber: 'house', state: 'FL', district: '27', party: 'R' },
  { id: 'FLH28', firstName: 'Carlos', lastName: 'Giménez', chamber: 'house', state: 'FL', district: '28', party: 'R' },
  { id: 'FLS1', firstName: 'Marco', lastName: 'Rubio', chamber: 'senate', state: 'FL', party: 'R' },
  { id: 'FLS2', firstName: 'Rick', lastName: 'Scott', chamber: 'senate', state: 'FL', party: 'R' },

  // Independent members
  { id: 'VTS1', firstName: 'Bernie', lastName: 'Sanders', chamber: 'senate', state: 'VT', party: 'I' },
  { id: 'VTS2', firstName: 'Peter', lastName: 'Welch', chamber: 'senate', state: 'VT', party: 'D' },
  { id: 'MEH02', firstName: 'Jared', lastName: 'Golden', chamber: 'house', state: 'ME', district: '02', party: 'I' },
  { id: 'MEH01', firstName: 'Chellie', lastName: 'Pingree', chamber: 'house', state: 'ME', district: '01', party: 'D' },
];

// Real congressional names database
const realNames = {
  // Common first names
  firstNames: [
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
  ],
  // Common last names
  lastNames: [
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
  ]
};

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate remaining members for all states
function generateRemainingMembers() {
  const allMembers = [...realMembers];
  
  // Generate remaining House members for all states
  for (const [stateCode, districtCount] of Object.entries(houseDistricts)) {
    const existingHouseMembers = allMembers.filter(m => m.state === stateCode && m.chamber === 'house');
    const existingDistricts = existingHouseMembers.map(m => parseInt(m.district!));
    
    // Generate missing House members
    for (let i = 1; i <= districtCount; i++) {
      if (!existingDistricts.includes(i)) {
        const firstName = getRandomElement(realNames.firstNames);
        const lastName = getRandomElement(realNames.lastNames);
        const party = Math.random() > 0.5 ? 'R' : 'D';
        
        allMembers.push({
          id: `${stateCode}H${i.toString().padStart(2, '0')}`,
          firstName,
          lastName,
          chamber: 'house',
          state: stateCode,
          district: i.toString().padStart(2, '0'),
          party,
        });
      }
    }
    
    // Generate Senate members if not already present
    const existingSenators = allMembers.filter(m => m.state === stateCode && m.chamber === 'senate');
    if (existingSenators.length === 0) {
      const party1 = Math.random() > 0.5 ? 'R' : 'D';
      const party2 = Math.random() > 0.5 ? 'R' : 'D';
      
      allMembers.push({
        id: `${stateCode}S1`,
        firstName: getRandomElement(realNames.firstNames),
        lastName: getRandomElement(realNames.lastNames),
        chamber: 'senate',
        state: stateCode,
        party: party1,
      });
      
      allMembers.push({
        id: `${stateCode}S2`,
        firstName: getRandomElement(realNames.firstNames),
        lastName: getRandomElement(realNames.lastNames),
        chamber: 'senate',
        state: stateCode,
        party: party2,
      });
    }
  }
  
  return allMembers;
}

async function main() {
  console.log('🌱 Starting complete congressional data seeding...');

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
    { id: 'house-ways-means', name: 'House Committee on Ways and Means' },
    { id: 'senate-appropriations', name: 'Senate Committee on Appropriations' },
    { id: 'senate-armed-services', name: 'Senate Committee on Armed Services' },
    { id: 'senate-judiciary', name: 'Senate Committee on Judiciary' },
    { id: 'senate-finance', name: 'Senate Committee on Finance' },
  ];

  for (const committee of committees) {
    await prisma.committee.create({
      data: {
        id: committee.id,
        name: committee.name,
      },
    });
  }

  // Generate all members
  console.log('👥 Generating all congressional members...');
  const allMembers = generateRemainingMembers();
  
  console.log(`📊 Generated ${allMembers.length} total members`);
  console.log(`   House: ${allMembers.filter(m => m.chamber === 'house').length}`);
  console.log(`   Senate: ${allMembers.filter(m => m.chamber === 'senate').length}`);

  // Create members in database
  console.log('💾 Saving members to database...');
  for (const member of allMembers) {
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
    const numCommittees = Math.floor(Math.random() * 3) + 1;
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

  console.log('✅ Complete congressional data seeding finished!');
  
  // Verify counts
  const houseCount = await prisma.member.count({ where: { chamber: 'house' } });
  const senateCount = await prisma.member.count({ where: { chamber: 'senate' } });
  const demCount = await prisma.member.count({ where: { party: 'D' } });
  const repCount = await prisma.member.count({ where: { party: 'R' } });
  const indCount = await prisma.member.count({ where: { party: 'I' } });
  
  console.log(`\n📈 Final Verification:`);
  console.log(`   House Representatives: ${houseCount} (expected: 435)`);
  console.log(`   Senators: ${senateCount} (expected: 100)`);
  console.log(`   Democrats: ${demCount}`);
  console.log(`   Republicans: ${repCount}`);
  console.log(`   Independents: ${indCount}`);
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
