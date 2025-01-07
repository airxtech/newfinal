// scripts/importBondingCurve.ts
import { prisma } from '../lib/prisma'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

async function importBondingCurveData() {
  try {
    console.log('Starting bonding curve data import...')
    
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'ZOA.fund_bonding_curve_V1  bonding_curve_data.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    
    console.log('CSV file loaded successfully')

    // Parse CSV data
    const { data } = Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    })

    console.log(`Found ${data.length} rows of bonding curve data`)

    // Process in batches to avoid memory issues
    const batchSize = 1000
    let importedCount = 0

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length))
      
      // Map CSV data to our schema structure
      const bondingSteps = batch.map((row: any) => ({
        id: `step_${row.Step}`,
        stepNumber: row.Step,
        tokensSold: row['Tokens Sold'],
        priceInTon: row['Price (TON)'],
        tonCollected: row['TON Collected at Step'],
        totalTonCollected: row['Total TON Collected'],
        createdAt: new Date()
      }))

      // Import batch
      await prisma.bondingCurveStep.createMany({
        data: bondingSteps
      })

      importedCount += batch.length
      console.log(`Imported ${importedCount} of ${data.length} steps`)
    }

    console.log('Bonding curve data import completed successfully')
  } catch (error) {
    console.error('Error importing bonding curve data:', error)
    throw error
  }
}

// Run the import
importBondingCurveData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Import failed:', error)
    process.exit(1)
  })