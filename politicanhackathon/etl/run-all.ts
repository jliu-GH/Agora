import { syncMembers as syncCongressMembers, syncBills } from './congress';
import { syncMembers as syncPropublicaMembers, syncVotes } from './propublica';
import { syncContributions, syncCommittees } from './openfec';
import { syncDWNominate } from './voteview';
import { syncCrimeData } from './fbi';
import { syncWISQARSData } from './cdc';

async function runAllETL() {
  console.log('Starting ETL process...');
  
  try {
    // Sync Congress data
    console.log('Syncing Congress data...');
    await syncCongressMembers(118);
    await syncBills(118);
    
    // Sync ProPublica data
    console.log('Syncing ProPublica data...');
    await syncPropublicaMembers(118);
    await syncVotes(118);
    
    // Sync OpenFEC data
    console.log('Syncing OpenFEC data...');
    await syncContributions(2024);
    await syncCommittees();
    
    // Sync Voteview data
    console.log('Syncing Voteview data...');
    await syncDWNominate(118);
    
    // Sync FBI data
    console.log('Syncing FBI data...');
    await syncCrimeData(2023);
    
    // Sync CDC data
    console.log('Syncing CDC data...');
    await syncWISQARSData(2023);
    
    console.log('ETL process completed successfully!');
  } catch (error) {
    console.error('ETL process failed:', error);
    process.exit(1);
  }
}

runAllETL();
