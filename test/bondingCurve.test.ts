// test/bondingCurve.test.ts
import { BondingCurveService } from "@/lib/services/bondingCurveService";

// Verify the bonding curve parameters } from "@/lib/services/bondingCurveService";

const verify = BondingCurveService.verifyBondingCurve();
console.log('Bonding Curve Verification:', verify);

// Test price at different points
const points = [0, 75_000_000, 150_000_000, 225_000_000, 300_000_000];
points.forEach(tokensSold => {
  const price = BondingCurveService.calculateTokenPrice(tokensSold);
  console.log(`Price at ${tokensSold} tokens:`, price, 'TON');
});

// Test buying with different TON amounts
const testAmounts = [10, 100, 1000];
testAmounts.forEach(tonAmount => {
  const result = BondingCurveService.calculateTokensForTON(tonAmount, 0);
  console.log(`Tokens received for ${tonAmount} TON:`, result.tokensReceived);
});