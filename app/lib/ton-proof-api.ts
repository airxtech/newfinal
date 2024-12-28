// app/lib/ton-proof-api.ts
import { Account, ConnectAdditionalRequest, TonProofItemReplySuccess } from "@tonconnect/ui-react";

class TonProofApiService {
  private localStorageKey = 'zoa-access-token';
  
  public accessToken: string | null = null;
  
  public readonly refreshIntervalMs = 9 * 60 * 1000;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(this.localStorageKey);
    }

    if (!this.accessToken) {
      this.generatePayload();
    }
  }

  async generatePayload(): Promise<ConnectAdditionalRequest | null> {
    try {
      const response = await fetch('/api/ton-proof/generate-payload', {
        method: 'POST',
      });
      const data = await response.json();
      return { tonProof: data.payload as string };
    } catch (error) {
      console.error('Error generating payload:', error);
      return null;
    }
  }

  async checkProof(proof: TonProofItemReplySuccess['proof'], account: Account) {
    try {
      const reqBody = {
        address: account.address,
        network: account.chain,
        proof: {
          ...proof,
          state_init: account.walletStateInit,
        },
      };

      const response = await fetch('/api/ton-proof/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqBody),
      });

      const data = await response.json();
      
      if (data?.token) {
        localStorage.setItem(this.localStorageKey, data.token);
        this.accessToken = data.token;
      }
    } catch (error) {
      console.error('Error checking proof:', error);
    }
  }

  async getAccountInfo(account: Account) {
    try {
      const response = await fetch(`/api/ton-proof/account-info?network=${account.chain}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error getting account info:', error);
      return {};
    }
  }

  reset() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.localStorageKey);
    }
    this.generatePayload();
  }
}

export const TonProofApi = new TonProofApiService();