// scripts/updateTonPrice.ts
import { TonPriceService } from '../lib/services/tonPriceService';

async function updatePrice() {
  try {
    const price = await TonPriceService.updatePrice();
    console.log(`Updated TON price: $${price}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to update TON price:', error);
    process.exit(1);
  }
}

// Run the update
updatePrice();