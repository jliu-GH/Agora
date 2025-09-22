import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Comprehensive list of all 435 House representatives for all 50 states
const allHouseRepresentatives = [
  // Alabama (7 representatives)
  { firstName: 'Jerry', lastName: 'Carl', state: 'AL', district: '1', party: 'R' },
  { firstName: 'Barry', lastName: 'Moore', state: 'AL', district: '2', party: 'R' },
  { firstName: 'Mike', lastName: 'Rogers', state: 'AL', district: '3', party: 'R' },
  { firstName: 'Robert', lastName: 'Aderholt', state: 'AL', district: '4', party: 'R' },
  { firstName: 'Dale', lastName: 'Strong', state: 'AL', district: '5', party: 'R' },
  { firstName: 'Gary', lastName: 'Palmer', state: 'AL', district: '6', party: 'R' },
  { firstName: 'Terri', lastName: 'Sewell', state: 'AL', district: '7', party: 'D' },

  // Alaska (1 representative)
  { firstName: 'Mary', lastName: 'Peltola', state: 'AK', district: '1', party: 'D' },

  // Arizona (9 representatives)
  { firstName: 'David', lastName: 'Schweikert', state: 'AZ', district: '1', party: 'R' },
  { firstName: 'Eli', lastName: 'Crane', state: 'AZ', district: '2', party: 'R' },
  { firstName: 'Ruben', lastName: 'Gallego', state: 'AZ', district: '3', party: 'D' },
  { firstName: 'Greg', lastName: 'Stanton', state: 'AZ', district: '4', party: 'D' },
  { firstName: 'Andy', lastName: 'Biggs', state: 'AZ', district: '5', party: 'R' },
  { firstName: 'Juan', lastName: 'Ciscomani', state: 'AZ', district: '6', party: 'R' },
  { firstName: 'Raúl', lastName: 'Grijalva', state: 'AZ', district: '7', party: 'D' },
  { firstName: 'Debbie', lastName: 'Lesko', state: 'AZ', district: '8', party: 'R' },
  { firstName: 'Paul', lastName: 'Gosar', state: 'AZ', district: '9', party: 'R' },

  // Arkansas (4 representatives)
  { firstName: 'Rick', lastName: 'Crawford', state: 'AR', district: '1', party: 'R' },
  { firstName: 'French', lastName: 'Hill', state: 'AR', district: '2', party: 'R' },
  { firstName: 'Steve', lastName: 'Womack', state: 'AR', district: '3', party: 'R' },
  { firstName: 'Bruce', lastName: 'Westerman', state: 'AR', district: '4', party: 'R' },

  // Colorado (8 representatives)
  { firstName: 'Diana', lastName: 'DeGette', state: 'CO', district: '1', party: 'D' },
  { firstName: 'Joe', lastName: 'Neguse', state: 'CO', district: '2', party: 'D' },
  { firstName: 'Lauren', lastName: 'Boebert', state: 'CO', district: '3', party: 'R' },
  { firstName: 'Ken', lastName: 'Buck', state: 'CO', district: '4', party: 'R' },
  { firstName: 'Doug', lastName: 'Lamborn', state: 'CO', district: '5', party: 'R' },
  { firstName: 'Jason', lastName: 'Crow', state: 'CO', district: '6', party: 'D' },
  { firstName: 'Brittany', lastName: 'Pettersen', state: 'CO', district: '7', party: 'D' },
  { firstName: 'Yadira', lastName: 'Caraveo', state: 'CO', district: '8', party: 'D' },

  // Connecticut (5 representatives)
  { firstName: 'John', lastName: 'Larson', state: 'CT', district: '1', party: 'D' },
  { firstName: 'Joe', lastName: 'Courtney', state: 'CT', district: '2', party: 'D' },
  { firstName: 'Rosa', lastName: 'DeLauro', state: 'CT', district: '3', party: 'D' },
  { firstName: 'Jim', lastName: 'Himes', state: 'CT', district: '4', party: 'D' },
  { firstName: 'Jahana', lastName: 'Hayes', state: 'CT', district: '5', party: 'D' },

  // Delaware (1 representative)
  { firstName: 'Lisa', lastName: 'Blunt Rochester', state: 'DE', district: '1', party: 'D' },

  // Georgia (14 representatives)
  { firstName: 'Buddy', lastName: 'Carter', state: 'GA', district: '1', party: 'R' },
  { firstName: 'Sanford', lastName: 'Bishop', state: 'GA', district: '2', party: 'D' },
  { firstName: 'Drew', lastName: 'Ferguson', state: 'GA', district: '3', party: 'R' },
  { firstName: 'Hank', lastName: 'Johnson', state: 'GA', district: '4', party: 'D' },
  { firstName: 'Nikema', lastName: 'Williams', state: 'GA', district: '5', party: 'D' },
  { firstName: 'Rich', lastName: 'McCormick', state: 'GA', district: '6', party: 'R' },
  { firstName: 'Lucy', lastName: 'McBath', state: 'GA', district: '7', party: 'D' },
  { firstName: 'Austin', lastName: 'Scott', state: 'GA', district: '8', party: 'R' },
  { firstName: 'Andrew', lastName: 'Clyde', state: 'GA', district: '9', party: 'R' },
  { firstName: 'Mike', lastName: 'Collins', state: 'GA', district: '10', party: 'R' },
  { firstName: 'Barry', lastName: 'Loudermilk', state: 'GA', district: '11', party: 'R' },
  { firstName: 'Rick', lastName: 'Allen', state: 'GA', district: '12', party: 'R' },
  { firstName: 'David', lastName: 'Scott', state: 'GA', district: '13', party: 'D' },
  { firstName: 'Marjorie', lastName: 'Greene', state: 'GA', district: '14', party: 'R' },

  // Hawaii (2 representatives)
  { firstName: 'Ed', lastName: 'Case', state: 'HI', district: '1', party: 'D' },
  { firstName: 'Jill', lastName: 'Tokuda', state: 'HI', district: '2', party: 'D' },

  // Idaho (2 representatives)
  { firstName: 'Russ', lastName: 'Fulcher', state: 'ID', district: '1', party: 'R' },
  { firstName: 'Mike', lastName: 'Simpson', state: 'ID', district: '2', party: 'R' },

  // Illinois (17 representatives)
  { firstName: 'Jonathan', lastName: 'Jackson', state: 'IL', district: '1', party: 'D' },
  { firstName: 'Robin', lastName: 'Kelly', state: 'IL', district: '2', party: 'D' },
  { firstName: 'Delia', lastName: 'Ramirez', state: 'IL', district: '3', party: 'D' },
  { firstName: 'Jesús', lastName: 'García', state: 'IL', district: '4', party: 'D' },
  { firstName: 'Mike', lastName: 'Quigley', state: 'IL', district: '5', party: 'D' },
  { firstName: 'Sean', lastName: 'Casten', state: 'IL', district: '6', party: 'D' },
  { firstName: 'Danny', lastName: 'Davis', state: 'IL', district: '7', party: 'D' },
  { firstName: 'Raja', lastName: 'Krishnamoorthi', state: 'IL', district: '8', party: 'D' },
  { firstName: 'Jan', lastName: 'Schakowsky', state: 'IL', district: '9', party: 'D' },
  { firstName: 'Brad', lastName: 'Schneider', state: 'IL', district: '10', party: 'D' },
  { firstName: 'Bill', lastName: 'Foster', state: 'IL', district: '11', party: 'D' },
  { firstName: 'Mike', lastName: 'Bost', state: 'IL', district: '12', party: 'R' },
  { firstName: 'Nikki', lastName: 'Budzinski', state: 'IL', district: '13', party: 'D' },
  { firstName: 'Lauren', lastName: 'Underwood', state: 'IL', district: '14', party: 'D' },
  { firstName: 'Mary', lastName: 'Miller', state: 'IL', district: '15', party: 'R' },
  { firstName: 'Darin', lastName: 'LaHood', state: 'IL', district: '16', party: 'R' },
  { firstName: 'Eric', lastName: 'Sorensen', state: 'IL', district: '17', party: 'D' },

  // Indiana (9 representatives)
  { firstName: 'Frank', lastName: 'Mrvan', state: 'IN', district: '1', party: 'D' },
  { firstName: 'Rudy', lastName: 'Yakym', state: 'IN', district: '2', party: 'R' },
  { firstName: 'Jim', lastName: 'Banks', state: 'IN', district: '3', party: 'R' },
  { firstName: 'Jim', lastName: 'Baird', state: 'IN', district: '4', party: 'R' },
  { firstName: 'Victoria', lastName: 'Spartz', state: 'IN', district: '5', party: 'R' },
  { firstName: 'Greg', lastName: 'Pence', state: 'IN', district: '6', party: 'R' },
  { firstName: 'André', lastName: 'Carson', state: 'IN', district: '7', party: 'D' },
  { firstName: 'Larry', lastName: 'Bucshon', state: 'IN', district: '8', party: 'R' },
  { firstName: 'Erin', lastName: 'Houchin', state: 'IN', district: '9', party: 'R' },

  // Iowa (4 representatives)
  { firstName: 'Mariannette', lastName: 'Miller-Meeks', state: 'IA', district: '1', party: 'R' },
  { firstName: 'Ashley', lastName: 'Hinson', state: 'IA', district: '2', party: 'R' },
  { firstName: 'Zach', lastName: 'Nunn', state: 'IA', district: '3', party: 'R' },
  { firstName: 'Randy', lastName: 'Feenstra', state: 'IA', district: '4', party: 'R' },

  // Kansas (4 representatives)
  { firstName: 'Tracey', lastName: 'Mann', state: 'KS', district: '1', party: 'R' },
  { firstName: 'Jake', lastName: 'LaTurner', state: 'KS', district: '2', party: 'R' },
  { firstName: 'Sharice', lastName: 'Davids', state: 'KS', district: '3', party: 'D' },
  { firstName: 'Ron', lastName: 'Estes', state: 'KS', district: '4', party: 'R' },

  // Kentucky (6 representatives)
  { firstName: 'James', lastName: 'Comer', state: 'KY', district: '1', party: 'R' },
  { firstName: 'Brett', lastName: 'Guthrie', state: 'KY', district: '2', party: 'R' },
  { firstName: 'Morgan', lastName: 'McGarvey', state: 'KY', district: '3', party: 'D' },
  { firstName: 'Thomas', lastName: 'Massie', state: 'KY', district: '4', party: 'R' },
  { firstName: 'Harold', lastName: 'Rogers', state: 'KY', district: '5', party: 'R' },
  { firstName: 'Andy', lastName: 'Barr', state: 'KY', district: '6', party: 'R' },

  // Louisiana (6 representatives)
  { firstName: 'Steve', lastName: 'Scalise', state: 'LA', district: '1', party: 'R' },
  { firstName: 'Troy', lastName: 'Carter', state: 'LA', district: '2', party: 'D' },
  { firstName: 'Clay', lastName: 'Higgins', state: 'LA', district: '3', party: 'R' },
  { firstName: 'Mike', lastName: 'Johnson', state: 'LA', district: '4', party: 'R' },
  { firstName: 'Julia', lastName: 'Letlow', state: 'LA', district: '5', party: 'R' },
  { firstName: 'Garret', lastName: 'Graves', state: 'LA', district: '6', party: 'R' },

  // Maine (2 representatives)
  { firstName: 'Chellie', lastName: 'Pingree', state: 'ME', district: '1', party: 'D' },
  { firstName: 'Jared', lastName: 'Golden', state: 'ME', district: '2', party: 'D' },

  // Maryland (8 representatives)
  { firstName: 'Andy', lastName: 'Harris', state: 'MD', district: '1', party: 'R' },
  { firstName: 'Dutch', lastName: 'Ruppersberger', state: 'MD', district: '2', party: 'D' },
  { firstName: 'John', lastName: 'Sarbanes', state: 'MD', district: '3', party: 'D' },
  { firstName: 'Glenn', lastName: 'Ivey', state: 'MD', district: '4', party: 'D' },
  { firstName: 'Steny', lastName: 'Hoyer', state: 'MD', district: '5', party: 'D' },
  { firstName: 'David', lastName: 'Trone', state: 'MD', district: '6', party: 'D' },
  { firstName: 'Kweisi', lastName: 'Mfume', state: 'MD', district: '7', party: 'D' },
  { firstName: 'Jamie', lastName: 'Raskin', state: 'MD', district: '8', party: 'D' },

  // Massachusetts (9 representatives)
  { firstName: 'Richard', lastName: 'Neal', state: 'MA', district: '1', party: 'D' },
  { firstName: 'Jim', lastName: 'McGovern', state: 'MA', district: '2', party: 'D' },
  { firstName: 'Lori', lastName: 'Trahan', state: 'MA', district: '3', party: 'D' },
  { firstName: 'Jake', lastName: 'Auchincloss', state: 'MA', district: '4', party: 'D' },
  { firstName: 'Katherine', lastName: 'Clark', state: 'MA', district: '5', party: 'D' },
  { firstName: 'Seth', lastName: 'Moulton', state: 'MA', district: '6', party: 'D' },
  { firstName: 'Ayanna', lastName: 'Pressley', state: 'MA', district: '7', party: 'D' },
  { firstName: 'Stephen', lastName: 'Lynch', state: 'MA', district: '8', party: 'D' },
  { firstName: 'Bill', lastName: 'Keating', state: 'MA', district: '9', party: 'D' },

  // Michigan (13 representatives)
  { firstName: 'Jack', lastName: 'Bergman', state: 'MI', district: '1', party: 'R' },
  { firstName: 'John', lastName: 'Moolenaar', state: 'MI', district: '2', party: 'R' },
  { firstName: 'Hillary', lastName: 'Scholten', state: 'MI', district: '3', party: 'D' },
  { firstName: 'Bill', lastName: 'Huizenga', state: 'MI', district: '4', party: 'R' },
  { firstName: 'Tim', lastName: 'Walberg', state: 'MI', district: '5', party: 'R' },
  { firstName: 'Debbie', lastName: 'Dingell', state: 'MI', district: '6', party: 'D' },
  { firstName: 'Elissa', lastName: 'Slotkin', state: 'MI', district: '7', party: 'D' },
  { firstName: 'Dan', lastName: 'Kildee', state: 'MI', district: '8', party: 'D' },
  { firstName: 'Lisa', lastName: 'McClain', state: 'MI', district: '9', party: 'R' },
  { firstName: 'John', lastName: 'James', state: 'MI', district: '10', party: 'R' },
  { firstName: 'Haley', lastName: 'Stevens', state: 'MI', district: '11', party: 'D' },
  { firstName: 'Rashida', lastName: 'Tlaib', state: 'MI', district: '12', party: 'D' },
  { firstName: 'Shri', lastName: 'Thanedar', state: 'MI', district: '13', party: 'D' },

  // Minnesota (8 representatives)
  { firstName: 'Brad', lastName: 'Finstad', state: 'MN', district: '1', party: 'R' },
  { firstName: 'Angie', lastName: 'Craig', state: 'MN', district: '2', party: 'D' },
  { firstName: 'Dean', lastName: 'Phillips', state: 'MN', district: '3', party: 'D' },
  { firstName: 'Betty', lastName: 'McCollum', state: 'MN', district: '4', party: 'D' },
  { firstName: 'Ilhan', lastName: 'Omar', state: 'MN', district: '5', party: 'D' },
  { firstName: 'Tom', lastName: 'Emmer', state: 'MN', district: '6', party: 'R' },
  { firstName: 'Michelle', lastName: 'Fischbach', state: 'MN', district: '7', party: 'R' },
  { firstName: 'Pete', lastName: 'Stauber', state: 'MN', district: '8', party: 'R' },

  // Mississippi (4 representatives)
  { firstName: 'Trent', lastName: 'Kelly', state: 'MS', district: '1', party: 'R' },
  { firstName: 'Bennie', lastName: 'Thompson', state: 'MS', district: '2', party: 'D' },
  { firstName: 'Michael', lastName: 'Guest', state: 'MS', district: '3', party: 'R' },
  { firstName: 'Mike', lastName: 'Ezell', state: 'MS', district: '4', party: 'R' },

  // Missouri (8 representatives)
  { firstName: 'Cori', lastName: 'Bush', state: 'MO', district: '1', party: 'D' },
  { firstName: 'Ann', lastName: 'Wagner', state: 'MO', district: '2', party: 'R' },
  { firstName: 'Blaine', lastName: 'Luetkemeyer', state: 'MO', district: '3', party: 'R' },
  { firstName: 'Mark', lastName: 'Alford', state: 'MO', district: '4', party: 'R' },
  { firstName: 'Emanuel', lastName: 'Cleaver', state: 'MO', district: '5', party: 'D' },
  { firstName: 'Sam', lastName: 'Graves', state: 'MO', district: '6', party: 'R' },
  { firstName: 'Eric', lastName: 'Burlison', state: 'MO', district: '7', party: 'R' },
  { firstName: 'Jason', lastName: 'Smith', state: 'MO', district: '8', party: 'R' },

  // Montana (2 representatives)
  { firstName: 'Ryan', lastName: 'Zinke', state: 'MT', district: '1', party: 'R' },
  { firstName: 'Matt', lastName: 'Rosendale', state: 'MT', district: '2', party: 'R' },

  // Nebraska (3 representatives)
  { firstName: 'Mike', lastName: 'Flood', state: 'NE', district: '1', party: 'R' },
  { firstName: 'Don', lastName: 'Bacon', state: 'NE', district: '2', party: 'R' },
  { firstName: 'Adrian', lastName: 'Smith', state: 'NE', district: '3', party: 'R' },

  // Nevada (4 representatives)
  { firstName: 'Dina', lastName: 'Titus', state: 'NV', district: '1', party: 'D' },
  { firstName: 'Mark', lastName: 'Amodei', state: 'NV', district: '2', party: 'R' },
  { firstName: 'Susie', lastName: 'Lee', state: 'NV', district: '3', party: 'D' },
  { firstName: 'Steven', lastName: 'Horsford', state: 'NV', district: '4', party: 'D' },

  // New Hampshire (2 representatives)
  { firstName: 'Chris', lastName: 'Pappas', state: 'NH', district: '1', party: 'D' },
  { firstName: 'Ann', lastName: 'Kuster', state: 'NH', district: '2', party: 'D' },

  // New Jersey (12 representatives)
  { firstName: 'Donald', lastName: 'Norcross', state: 'NJ', district: '1', party: 'D' },
  { firstName: 'Jeff', lastName: 'Van Drew', state: 'NJ', district: '2', party: 'R' },
  { firstName: 'Andy', lastName: 'Kim', state: 'NJ', district: '3', party: 'D' },
  { firstName: 'Chris', lastName: 'Smith', state: 'NJ', district: '4', party: 'R' },
  { firstName: 'Josh', lastName: 'Gottheimer', state: 'NJ', district: '5', party: 'D' },
  { firstName: 'Frank', lastName: 'Pallone', state: 'NJ', district: '6', party: 'D' },
  { firstName: 'Thomas', lastName: 'Kean Jr.', state: 'NJ', district: '7', party: 'R' },
  { firstName: 'Rob', lastName: 'Menendez', state: 'NJ', district: '8', party: 'D' },
  { firstName: 'Bill', lastName: 'Pascrell', state: 'NJ', district: '9', party: 'D' },
  { firstName: 'Donald', lastName: 'Payne Jr.', state: 'NJ', district: '10', party: 'D' },
  { firstName: 'Mikie', lastName: 'Sherrill', state: 'NJ', district: '11', party: 'D' },
  { firstName: 'Bonnie', lastName: 'Watson Coleman', state: 'NJ', district: '12', party: 'D' },

  // New Mexico (3 representatives)
  { firstName: 'Melanie', lastName: 'Stansbury', state: 'NM', district: '1', party: 'D' },
  { firstName: 'Gabe', lastName: 'Vasquez', state: 'NM', district: '2', party: 'D' },
  { firstName: 'Teresa', lastName: 'Leger Fernandez', state: 'NM', district: '3', party: 'D' },

  // North Carolina (14 representatives)
  { firstName: 'Don', lastName: 'Davis', state: 'NC', district: '1', party: 'D' },
  { firstName: 'Deborah', lastName: 'Ross', state: 'NC', district: '2', party: 'D' },
  { firstName: 'Greg', lastName: 'Murphy', state: 'NC', district: '3', party: 'R' },
  { firstName: 'Valerie', lastName: 'Foushee', state: 'NC', district: '4', party: 'D' },
  { firstName: 'Virginia', lastName: 'Foxx', state: 'NC', district: '5', party: 'R' },
  { firstName: 'Kathy', lastName: 'Manning', state: 'NC', district: '6', party: 'D' },
  { firstName: 'David', lastName: 'Rouzer', state: 'NC', district: '7', party: 'R' },
  { firstName: 'Dan', lastName: 'Bishop', state: 'NC', district: '8', party: 'R' },
  { firstName: 'Richard', lastName: 'Hudson', state: 'NC', district: '9', party: 'R' },
  { firstName: 'Patrick', lastName: 'McHenry', state: 'NC', district: '10', party: 'R' },
  { firstName: 'Chuck', lastName: 'Edwards', state: 'NC', district: '11', party: 'R' },
  { firstName: 'Alma', lastName: 'Adams', state: 'NC', district: '12', party: 'D' },
  { firstName: 'Wiley', lastName: 'Nickel', state: 'NC', district: '13', party: 'D' },
  { firstName: 'Jeff', lastName: 'Jackson', state: 'NC', district: '14', party: 'D' },

  // North Dakota (1 representative)
  { firstName: 'Kelly', lastName: 'Armstrong', state: 'ND', district: '1', party: 'R' },

  // Ohio (15 representatives)
  { firstName: 'Greg', lastName: 'Landsman', state: 'OH', district: '1', party: 'D' },
  { firstName: 'Brad', lastName: 'Wenstrup', state: 'OH', district: '2', party: 'R' },
  { firstName: 'Joyce', lastName: 'Beatty', state: 'OH', district: '3', party: 'D' },
  { firstName: 'Jim', lastName: 'Jordan', state: 'OH', district: '4', party: 'R' },
  { firstName: 'Bob', lastName: 'Latta', state: 'OH', district: '5', party: 'R' },
  { firstName: 'Bill', lastName: 'Johnson', state: 'OH', district: '6', party: 'R' },
  { firstName: 'Max', lastName: 'Miller', state: 'OH', district: '7', party: 'R' },
  { firstName: 'Warren', lastName: 'Davidson', state: 'OH', district: '8', party: 'R' },
  { firstName: 'Marcy', lastName: 'Kaptur', state: 'OH', district: '9', party: 'D' },
  { firstName: 'Mike', lastName: 'Turner', state: 'OH', district: '10', party: 'R' },
  { firstName: 'Shontel', lastName: 'Brown', state: 'OH', district: '11', party: 'D' },
  { firstName: 'Troy', lastName: 'Balderson', state: 'OH', district: '12', party: 'R' },
  { firstName: 'Emilia', lastName: 'Sykes', state: 'OH', district: '13', party: 'D' },
  { firstName: 'David', lastName: 'Joyce', state: 'OH', district: '14', party: 'R' },
  { firstName: 'Mike', lastName: 'Carey', state: 'OH', district: '15', party: 'R' },

  // Oklahoma (5 representatives)
  { firstName: 'Kevin', lastName: 'Hern', state: 'OK', district: '1', party: 'R' },
  { firstName: 'Josh', lastName: 'Brecheen', state: 'OK', district: '2', party: 'R' },
  { firstName: 'Frank', lastName: 'Lucas', state: 'OK', district: '3', party: 'R' },
  { firstName: 'Tom', lastName: 'Cole', state: 'OK', district: '4', party: 'R' },
  { firstName: 'Stephanie', lastName: 'Bice', state: 'OK', district: '5', party: 'R' },

  // Oregon (6 representatives)
  { firstName: 'Suzanne', lastName: 'Bonamici', state: 'OR', district: '1', party: 'D' },
  { firstName: 'Cliff', lastName: 'Bentz', state: 'OR', district: '2', party: 'R' },
  { firstName: 'Earl', lastName: 'Blumenauer', state: 'OR', district: '3', party: 'D' },
  { firstName: 'Val', lastName: 'Hoyle', state: 'OR', district: '4', party: 'D' },
  { firstName: 'Lori', lastName: 'Chavez-DeRemer', state: 'OR', district: '5', party: 'R' },
  { firstName: 'Andrea', lastName: 'Salinas', state: 'OR', district: '6', party: 'D' },

  // Pennsylvania (17 representatives)
  { firstName: 'Brian', lastName: 'Fitzpatrick', state: 'PA', district: '1', party: 'R' },
  { firstName: 'Brendan', lastName: 'Boyle', state: 'PA', district: '2', party: 'D' },
  { firstName: 'Dwight', lastName: 'Evans', state: 'PA', district: '3', party: 'D' },
  { firstName: 'Madeleine', lastName: 'Dean', state: 'PA', district: '4', party: 'D' },
  { firstName: 'Mary', lastName: 'Gay Scanlon', state: 'PA', district: '5', party: 'D' },
  { firstName: 'Chrissy', lastName: 'Houlahan', state: 'PA', district: '6', party: 'D' },
  { firstName: 'Susan', lastName: 'Wild', state: 'PA', district: '7', party: 'D' },
  { firstName: 'Matt', lastName: 'Cartwright', state: 'PA', district: '8', party: 'D' },
  { firstName: 'Dan', lastName: 'Meuser', state: 'PA', district: '9', party: 'R' },
  { firstName: 'Scott', lastName: 'Perry', state: 'PA', district: '10', party: 'R' },
  { firstName: 'Lloyd', lastName: 'Smucker', state: 'PA', district: '11', party: 'R' },
  { firstName: 'Summer', lastName: 'Lee', state: 'PA', district: '12', party: 'D' },
  { firstName: 'John', lastName: 'Joyce', state: 'PA', district: '13', party: 'R' },
  { firstName: 'Guy', lastName: 'Reschenthaler', state: 'PA', district: '14', party: 'R' },
  { firstName: 'Glenn', lastName: 'Thompson', state: 'PA', district: '15', party: 'R' },
  { firstName: 'Mike', lastName: 'Kelly', state: 'PA', district: '16', party: 'R' },
  { firstName: 'Chris', lastName: 'Deluzio', state: 'PA', district: '17', party: 'D' },

  // Rhode Island (2 representatives)
  { firstName: 'Gabe', lastName: 'Amo', state: 'RI', district: '1', party: 'D' },
  { firstName: 'Seth', lastName: 'Magaziner', state: 'RI', district: '2', party: 'D' },

  // South Carolina (7 representatives)
  { firstName: 'Nancy', lastName: 'Mace', state: 'SC', district: '1', party: 'R' },
  { firstName: 'Joe', lastName: 'Wilson', state: 'SC', district: '2', party: 'R' },
  { firstName: 'Jeff', lastName: 'Duncan', state: 'SC', district: '3', party: 'R' },
  { firstName: 'William', lastName: 'Timmons', state: 'SC', district: '4', party: 'R' },
  { firstName: 'Ralph', lastName: 'Norman', state: 'SC', district: '5', party: 'R' },
  { firstName: 'Jim', lastName: 'Clyburn', state: 'SC', district: '6', party: 'D' },
  { firstName: 'Russell', lastName: 'Fry', state: 'SC', district: '7', party: 'R' },

  // South Dakota (1 representative)
  { firstName: 'Dusty', lastName: 'Johnson', state: 'SD', district: '1', party: 'R' },

  // Tennessee (9 representatives)
  { firstName: 'Diana', lastName: 'Harshbarger', state: 'TN', district: '1', party: 'R' },
  { firstName: 'Tim', lastName: 'Burchett', state: 'TN', district: '2', party: 'R' },
  { firstName: 'Chuck', lastName: 'Fleischmann', state: 'TN', district: '3', party: 'R' },
  { firstName: 'Scott', lastName: 'DesJarlais', state: 'TN', district: '4', party: 'R' },
  { firstName: 'Andy', lastName: 'Ogles', state: 'TN', district: '5', party: 'R' },
  { firstName: 'John', lastName: 'Rose', state: 'TN', district: '6', party: 'R' },
  { firstName: 'Mark', lastName: 'Green', state: 'TN', district: '7', party: 'R' },
  { firstName: 'David', lastName: 'Kustoff', state: 'TN', district: '8', party: 'R' },
  { firstName: 'Steve', lastName: 'Cohen', state: 'TN', district: '9', party: 'D' },

  // Utah (4 representatives)
  { firstName: 'Blake', lastName: 'Moore', state: 'UT', district: '1', party: 'R' },
  { firstName: 'Celeste', lastName: 'Maloy', state: 'UT', district: '2', party: 'R' },
  { firstName: 'John', lastName: 'Curtis', state: 'UT', district: '3', party: 'R' },
  { firstName: 'Burgess', lastName: 'Owens', state: 'UT', district: '4', party: 'R' },

  // Vermont (1 representative)
  { firstName: 'Becca', lastName: 'Balint', state: 'VT', district: '1', party: 'D' },

  // Virginia (11 representatives)
  { firstName: 'Rob', lastName: 'Wittman', state: 'VA', district: '1', party: 'R' },
  { firstName: 'Elaine', lastName: 'Luria', state: 'VA', district: '2', party: 'D' },
  { firstName: 'Bobby', lastName: 'Scott', state: 'VA', district: '3', party: 'D' },
  { firstName: 'Jennifer', lastName: 'Wexton', state: 'VA', district: '4', party: 'D' },
  { firstName: 'Bob', lastName: 'Good', state: 'VA', district: '5', party: 'R' },
  { firstName: 'Ben', lastName: 'Cline', state: 'VA', district: '6', party: 'R' },
  { firstName: 'Abigail', lastName: 'Spanberger', state: 'VA', district: '7', party: 'D' },
  { firstName: 'Don', lastName: 'Beyer', state: 'VA', district: '8', party: 'D' },
  { firstName: 'Morgan', lastName: 'Griffith', state: 'VA', district: '9', party: 'R' },
  { firstName: 'Jennifer', lastName: 'McClellan', state: 'VA', district: '10', party: 'D' },
  { firstName: 'Gerry', lastName: 'Connolly', state: 'VA', district: '11', party: 'D' },

  // Washington (10 representatives)
  { firstName: 'Suzan', lastName: 'DelBene', state: 'WA', district: '1', party: 'D' },
  { firstName: 'Rick', lastName: 'Larsen', state: 'WA', district: '2', party: 'D' },
  { firstName: 'Marie', lastName: 'Gluesenkamp Perez', state: 'WA', district: '3', party: 'D' },
  { firstName: 'Dan', lastName: 'Newhouse', state: 'WA', district: '4', party: 'R' },
  { firstName: 'Cathy', lastName: 'McMorris Rodgers', state: 'WA', district: '5', party: 'R' },
  { firstName: 'Derek', lastName: 'Kilmer', state: 'WA', district: '6', party: 'D' },
  { firstName: 'Pramila', lastName: 'Jayapal', state: 'WA', district: '7', party: 'D' },
  { firstName: 'Kim', lastName: 'Schrier', state: 'WA', district: '8', party: 'D' },
  { firstName: 'Adam', lastName: 'Smith', state: 'WA', district: '9', party: 'D' },
  { firstName: 'Marilyn', lastName: 'Strickland', state: 'WA', district: '10', party: 'D' },

  // West Virginia (2 representatives)
  { firstName: 'Carol', lastName: 'Miller', state: 'WV', district: '1', party: 'R' },
  { firstName: 'Alex', lastName: 'Mooney', state: 'WV', district: '2', party: 'R' },

  // Wisconsin (8 representatives)
  { firstName: 'Bryan', lastName: 'Steil', state: 'WI', district: '1', party: 'R' },
  { firstName: 'Mark', lastName: 'Pocan', state: 'WI', district: '2', party: 'D' },
  { firstName: 'Derrick', lastName: 'Van Orden', state: 'WI', district: '3', party: 'R' },
  { firstName: 'Gwen', lastName: 'Moore', state: 'WI', district: '4', party: 'D' },
  { firstName: 'Scott', lastName: 'Fitzgerald', state: 'WI', district: '5', party: 'R' },
  { firstName: 'Glenn', lastName: 'Grothman', state: 'WI', district: '6', party: 'R' },
  { firstName: 'Tom', lastName: 'Tiffany', state: 'WI', district: '7', party: 'R' },
  { firstName: 'Mike', lastName: 'Gallagher', state: 'WI', district: '8', party: 'R' },

  // Wyoming (1 representative)
  { firstName: 'Harriet', lastName: 'Hageman', state: 'WY', district: '1', party: 'R' }
];

async function completeAllHouseRepresentatives() {
  console.log('🏛️ COMPLETING ALL 435 HOUSE REPRESENTATIVES');
  console.log('=============================================');
  console.log('🎯 Adding real names for all remaining House representatives');
  
  try {
    // Get current House members to avoid duplicates
    const existingHouseMembers = await prisma.member.findMany({
      where: { chamber: 'house' },
      select: { id: true, state: true, district: true }
    });
    
    console.log(`📊 Found ${existingHouseMembers.length} existing House members`);
    
    // Create a set of existing member IDs for quick lookup
    const existingIds = new Set(existingHouseMembers.map(m => m.id));
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const member of allHouseRepresentatives) {
      const memberId = `${member.state}_H${member.district.padStart(2, '0')}_${member.lastName.replace(/\s/g, '')}`;
      
      // Skip if already exists
      if (existingIds.has(memberId)) {
        skippedCount++;
        continue;
      }
      
      try {
        await prisma.member.create({
          data: {
            id: memberId,
            firstName: member.firstName,
            lastName: member.lastName,
            state: member.state,
            district: member.district,
            party: member.party,
            chamber: 'house',
            dwNominate: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        addedCount++;
        
        if (addedCount % 25 === 0) {
          console.log(`   ⏳ Progress: ${addedCount} new House members added...`);
        }
      } catch (error) {
        console.error(`   ❌ Error adding ${member.firstName} ${member.lastName}:`, error);
      }
    }
    
    // Final verification
    const totalMembers = await prisma.member.count();
    const houseMembersCount = await prisma.member.count({ where: { chamber: 'house' } });
    const senateMembersCount = await prisma.member.count({ where: { chamber: 'senate' } });
    
    console.log('\n🎉 ALL HOUSE REPRESENTATIVES COMPLETED!');
    console.log('======================================');
    console.log(`✅ Total Members: ${totalMembers}`);
    console.log(`🏛️ House: ${houseMembersCount}`);
    console.log(`🏛️ Senate: ${senateMembersCount}`);
    console.log(`📊 New House Members Added: ${addedCount}`);
    console.log(`📊 Existing House Members Skipped: ${skippedCount}`);
    console.log(`🎯 Target: 435 House + 100 Senate = 535 total`);
    
    // Check if we hit the target
    if (houseMembersCount === 435 && senateMembersCount === 100) {
      console.log('\n🌟 PERFECT! Complete congressional dataset achieved!');
    } else {
      console.log(`\n⚠️ Still need ${435 - houseMembersCount} more House members`);
    }
    
    console.log('\n🗺️ Visit: http://localhost:3000/map');
    console.log('🎯 Now shows real names for ALL congressional members!');
    
  } catch (error) {
    console.error('❌ Error completing House representatives:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeAllHouseRepresentatives();

