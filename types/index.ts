// types/index.ts
export interface TonWalletAccount {
    address: string
    chain: number
    walletStateInit?: string
    publicKey?: string
  }
  
  export interface TonWallet {
    account: TonWalletAccount
    connectTime?: number
    device?: {
      platform: string
      appName: string
      appVersion?: string
    }
  }
  
  export interface Token {
    id: string
    name: string
    ticker: string
    imageUrl: string | null
    description: string
    totalSupply: number
    currentPrice: number
    marketCap: number
    bondingCurve: number
    isListed: boolean
    contractAddress: string | null
    createdAt: Date
    creatorId: string
  }
  
  export interface UserToken {
    id: string
    userId: string
    tokenId: string
    balance: number
    token: Token
  }
  
  export interface User {
    id: string
    telegramId: number
    firstName: string
    lastName: string | null
    username: string | null
    zoaBalance: number
    tonBalance: number | null
    walletAddress: string | null
    lastConnected: Date | null
  }
  
  export interface TonCenterResponse {
    ok: boolean
    result: {
      balance: string
      state: string
      code: string
      data: string
      last_transaction_id: {
        lt: string
        hash: string
      }
    }
  }