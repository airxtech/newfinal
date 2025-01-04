// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'

interface Transaction {
  in_msg: {
    source: string
    destination: string
    value: string
  }
  utime: number
  transaction_id: {
    lt: string
    hash: string
  }
  fee: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { txHash, expectedAmount } = body

    console.log('Starting verification:', { 
      expectedAmount,
      platformWallet: process.env.NEXT_PUBLIC_WALLET_ADDRESS
    })

    if (!process.env.TONCENTER_API_KEY) {
      console.error('TONCENTER_API_KEY not found')
      throw new Error('API key configuration error')
    }

    // Wait for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get recent transactions for our wallet
    const response = await fetch(
      `https://toncenter.com/api/v2/getTransactions?address=${process.env.NEXT_PUBLIC_WALLET_ADDRESS}&limit=50`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': process.env.TONCENTER_API_KEY
        }
      }
    )

    console.log('TonCenter API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TonCenter API error:', errorText)
      throw new Error(`TonCenter API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Found total transactions:', data.result?.length)

    // Current timestamp
    const currentTime = Math.floor(Date.now() / 1000)
    const fifteenMinutesAgo = currentTime - (60 * 60)

    // Filter transactions:
    // 1. Within last 60 minutes
    // 2. Matches expected amount
    // 3. Sent to our wallet
    const matchingTx = data.result?.find((tx: Transaction) => {
      // Check timestamp
      if (tx.utime < fifteenMinutesAgo) {
        return false
      }

      // Check destination
      if (tx.in_msg.destination.toLowerCase() !== process.env.NEXT_PUBLIC_WALLET_ADDRESS?.toLowerCase()) {
        return false
      }

      // Check amount (convert from nanoTON to TON)
      const txAmount = parseInt(tx.in_msg.value || '0') / 1e9
      const expectedTON = expectedAmount / 1e9
      const amountDiff = Math.abs(txAmount - expectedTON)

      console.log('Checking transaction:', {
        timestamp: new Date(tx.utime * 1000).toISOString(),
        txAmount,
        expectedTON,
        difference: amountDiff,
        from: tx.in_msg.source
      })

      return amountDiff < 0.001 // Allow 0.001 TON margin for fees
    })

    if (!matchingTx) {
      console.log('No matching recent transaction found')
      throw new Error('No matching transaction found in the last 15 minutes')
    }

    // Found matching transaction
    console.log('Found matching transaction:', {
      hash: matchingTx.transaction_id.hash,
      amount: parseInt(matchingTx.in_msg.value) / 1e9,
      time: new Date(matchingTx.utime * 1000).toISOString(),
      sender: matchingTx.in_msg.source
    })

    return NextResponse.json({
      success: true,
      verified: true,
      transaction: {
        hash: matchingTx.transaction_id.hash,
        amount: parseInt(matchingTx.in_msg.value) / 1e9,
        timestamp: matchingTx.utime,
        sender: matchingTx.in_msg.source,
        recipient: matchingTx.in_msg.destination,
        details: {
          lt: matchingTx.transaction_id.lt,
          fee: matchingTx.fee,
          timeAgo: Math.floor((currentTime - matchingTx.utime) / 60) + ' minutes ago'
        }
      }
    })

  } catch (error) {
    console.error('Verification failed:', error)
    return NextResponse.json(
      { 
        error: 'Transaction verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}