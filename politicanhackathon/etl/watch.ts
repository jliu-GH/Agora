import { watch } from 'fs';
import { syncMembers as syncCongressMembers } from './congress';
import { syncMembers as syncPropublicaMembers } from './propublica';

async function runWatchETL() {
  console.log('Starting ETL watch mode...');
  console.log('Watching for changes in ETL files...');
  
  // Watch for changes in ETL files and re-run sync
  watch('./etl', { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.ts')) {
      console.log(`File ${filename} changed, re-running ETL...`);
      // In a real implementation, you would re-run the specific ETL function
      // For now, just log the change
      console.log(`Would re-run ETL for ${filename}`);
    }
  });
  
  console.log('ETL watch mode active. Press Ctrl+C to stop.');
}

runWatchETL();
