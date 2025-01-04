// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { txHash, expectedAmount } = body

    console.log('Verifying transaction:', { txHash, expectedAmount })

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      )
    }

    if (!process.env.TONCENTER_API_KEY) {
      console.error('TONCENTER_API_KEY not found')
      throw new Error('API key configuration error')
    }

    // Wait for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Use V3 API to search for recent transactions
    const response = await fetch(
      `https://toncenter.com/api/v3/transactions?account=${process.env.NEXT_PUBLIC_WALLET_ADDRESS}&limit=20`,
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
    console.log('TonCenter API response data:', JSON.stringify(data, null, 2))

    // Look for matching transaction in recent history
    const tx = data.transactions?.find((t: any) => {
      const txValue = parseInt(t.in_msg?.value || '0')
      const expectedValue = expectedAmount
      
      // Check if amounts match (within 0.001 TON margin)
      const valueDiff = Math.abs(txValue - expectedValue) / 1e9
      return valueDiff < 0.001
    })

    if (!tx) {
      console.error('No matching transaction found')
      throw new Error('Transaction not found')
    }

    // All verifications passed
    console.log('Transaction verified successfully:', tx)
    return NextResponse.json({
      success: true,
      verified: true,
      transaction: {
        hash: tx.hash,
        amount: parseInt(tx.in_msg.value) / 1e9,
        timestamp: parseInt(tx.in_msg.created_at),
        sender: tx.in_msg.source,
        recipient: tx.in_msg.destination
      }
    })

  } catch (error) {
    console.error('Verification error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { 
        error: 'Transaction verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}