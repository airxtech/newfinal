// lib/services/bondingCurveService.ts

export class BondingCurveService {
    // Constants for token economics (in TON)
    private static readonly TOTAL_SUPPLY = 300_000_000; // 300M tokens
    private static readonly TARGET_BONDING_VALUE = 5_000; // 5000 TON total for bonding curve
    private static readonly FINAL_TOKEN_PRICE = 0.00006666666; // Final price per token in TON
    private static readonly INITIAL_TOKEN_PRICE = 0.00000001; // Starting price in TON
    
    /**
     * Calculate token price based on tokens sold
     * Uses exponential curve: P = P0 * e^(kx)
     * where:
     * P0 = initial price
     * k = growth rate
     * x = tokens sold / total supply
     */
    static calculateTokenPrice(tokensSold: number): number {
      // Validate input
      if (tokensSold < 0 || tokensSold > this.TOTAL_SUPPLY) {
        throw new Error('Invalid tokens sold amount');
      }
  
      // Calculate k (growth rate) based on final price target
      const k = Math.log(this.FINAL_TOKEN_PRICE / this.INITIAL_TOKEN_PRICE);
      
      // Calculate current progress ratio (x)
      const x = tokensSold / this.TOTAL_SUPPLY;
      
      // Calculate current price
      const currentPrice = this.INITIAL_TOKEN_PRICE * Math.exp(k * x);
      
      return currentPrice;
    }
  
    /**
     * Calculate integral of price curve between two points
     * This gives us the TON amount for a range of tokens
     */
    private static calculateIntegral(startTokens: number, endTokens: number): number {
      const k = Math.log(this.FINAL_TOKEN_PRICE / this.INITIAL_TOKEN_PRICE);
      
      const integral = (x: number) => {
        return (this.INITIAL_TOKEN_PRICE * this.TOTAL_SUPPLY / k) * 
               (Math.exp(k * x / this.TOTAL_SUPPLY));
      };
  
      return integral(endTokens) - integral(startTokens);
    }
  
    /**
     * Calculate tokens received for a given TON amount
     */
    static calculateTokensForTON(
      tonAmount: number,
      currentTokensSold: number
    ): {
      tokensReceived: number,
      averagePrice: number,
      priceImpact: number
    } {
      // Binary search to find the token amount that costs exactly tonAmount
      let low = currentTokensSold;
      let high = this.TOTAL_SUPPLY;
      let mid: number;
      const epsilon = 0.000001; // Precision threshold
      
      while (high - low > epsilon) {
        mid = (low + high) / 2;
        const cost = this.calculateIntegral(currentTokensSold, mid);
        
        if (Math.abs(cost - tonAmount) < epsilon) {
          break;
        }
        
        if (cost < tonAmount) {
          low = mid;
        } else {
          high = mid;
        }
      }
  
      const tokensReceived = high - currentTokensSold;
      const startPrice = this.calculateTokenPrice(currentTokensSold);
      const endPrice = this.calculateTokenPrice(currentTokensSold + tokensReceived);
      const averagePrice = tonAmount / tokensReceived;
      const priceImpact = ((endPrice - startPrice) / startPrice) * 100;
  
      return {
        tokensReceived,
        averagePrice,
        priceImpact
      };
    }
  
    /**
     * Calculate TON received for selling tokens
     */
    static calculateTONForTokens(
      tokenAmount: number,
      currentTokensSold: number
    ): {
      tonReceived: number,
      averagePrice: number,
      priceImpact: number
    } {
      if (currentTokensSold < tokenAmount) {
        throw new Error('Not enough tokens sold to buy back');
      }
  
      const tonAmount = this.calculateIntegral(
        currentTokensSold - tokenAmount,
        currentTokensSold
      );
  
      const startPrice = this.calculateTokenPrice(currentTokensSold);
      const endPrice = this.calculateTokenPrice(currentTokensSold - tokenAmount);
      const averagePrice = tonAmount / tokenAmount;
      const priceImpact = ((endPrice - startPrice) / startPrice) * 100;
  
      return {
        tonReceived: tonAmount,
        averagePrice,
        priceImpact
      };
    }
  
    /**
     * Get current bonding curve stats
     */
    static getBondingCurveStats(currentTokensSold: number) {
      const currentPrice = this.calculateTokenPrice(currentTokensSold);
      const totalValueLocked = this.calculateIntegral(0, currentTokensSold);
      const remainingTON = this.TARGET_BONDING_VALUE - totalValueLocked;
      
      return {
        tokensSold: currentTokensSold,
        tokensRemaining: this.TOTAL_SUPPLY - currentTokensSold,
        currentPrice,
        totalValueLocked,
        remainingTON,
        progressPercentage: (currentTokensSold / this.TOTAL_SUPPLY) * 100
      };
    }
  
    /**
     * Verify bonding curve integrity
     * This function can be used to validate that our calculations are correct
     */
    static verifyBondingCurve() {
      const totalArea = this.calculateIntegral(0, this.TOTAL_SUPPLY);
      const finalPrice = this.calculateTokenPrice(this.TOTAL_SUPPLY);
      const initialPrice = this.calculateTokenPrice(0);
  
      return {
        totalTONRequired: totalArea,
        finalTokenPrice: finalPrice,
        initialTokenPrice: initialPrice,
        isValid: Math.abs(totalArea - this.TARGET_BONDING_VALUE) < 0.1 // Allow 0.1 TON margin of error
      };
    }
  }