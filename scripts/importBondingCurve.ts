// scripts/importBondingCurve.ts
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parse } = require('papaparse');

const prisma = new PrismaClient();

async function importBondingCurveData() {
  try {
    // First, clear existing data
    console.log('Clearing existing bonding curve data...');
    await prisma.bondingCurveStep.deleteMany({});

    // Read the CSV file
    console.log('Reading CSV file...');
    // Look for the CSV file in the 'data' directory
    const csvPath = path.join(process.cwd(), 'data', 'bonding_curve.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}. Please ensure the file exists in the data directory.`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('CSV file loaded successfully');

    // Parse CSV
    const { data } = parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value: any) => {
        if (typeof value === 'string' && value.includes(',')) {
          return Number(value.replace(',', ''));
        }
        return value;
      }
    });

    console.log(`Found ${data.length} bonding curve steps to import`);

    // Process in batches of 1000
    const batchSize = 1000;
    let importedCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length));
      
      const bondingSteps = batch.map((row: any) => ({
        id: `step_${row.Step}`,
        stepNumber: row.Step,
        tokensSold: row['Tokens Sold'],
        priceInTon: row['Price (TON)'],
        tonCollected: row['TON Collected at Step'],
        totalTonCollected: row['Total TON Collected'],
        createdAt: new Date()
      }));

      await prisma.bondingCurveStep.createMany({
        data: bondingSteps
      });

      importedCount += batch.length;
      console.log(`Imported ${importedCount} of ${data.length} steps`);
    }

    // Verify the import
    const count = await prisma.bondingCurveStep.count();
    console.log(`Import complete. Total records in database: ${count}`);

    if (count === data.length) {
      console.log('✅ All data imported successfully!');
    } else {
      console.warn(`⚠️ Warning: Imported ${count} records but CSV had ${data.length} rows`);
    }

  } catch (error) {
    console.error('Error importing bonding curve data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importBondingCurveData()
  .then(() => {
    console.log('Finished importing bonding curve data');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to import bonding curve data:', error);
    process.exit(1);
  });