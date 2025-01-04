// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { txHash, expectedAmount } = body

    console.log('Starting verification:', { 
      txHash, 
      expectedAmount,
      walletAddress: process.env.NEXT_PUBLIC_WALLET_ADDRESS 
    })

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

    // First, get the specific transaction we're looking for
    const txResponse = await fetch(
      `https://toncenter.com/api/v3/transaction?hash=${txHash}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': process.env.TONCENTER_API_KEY
        }
      }
    )

    console.log('Transaction lookup response status:', txResponse.status)

    if (!txResponse.ok) {
      const errorText = await txResponse.text()
      console.error('Transaction lookup error:', errorText)
      throw new Error('Transaction not found')
    }

    const txData = await txResponse.json()
    console.log('Transaction data:', JSON.stringify(txData, null, 2))

    if (!txData.transaction) {
      throw new Error('Transaction not found')
    }

    const tx = txData.transaction

    // Verify destination address
    if (tx.in_msg.destination.toUpperCase() !== process.env.NEXT_PUBLIC_WALLET_ADDRESS?.toUpperCase()) {
      console.error('Address mismatch:', {
        expected: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
        received: tx.in_msg.destination
      })
      throw new Error('Invalid destination address')
    }

    // Verify amount
    const txAmount = parseInt(tx.in_msg.value) / 1e9
    const expectedTON = expectedAmount / 1e9
    const amountDiff = Math.abs(txAmount - expectedTON)

    console.log('Amount verification:', {
      received: txAmount,
      expected: expectedTON,
      difference: amountDiff
    })

    if (amountDiff > 0.001) {
      throw new Error('Invalid transaction amount')
    }

    // Verify transaction time (must be within last 10 minutes)
    const txTime = parseInt(tx.utime)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeDiff = currentTime - txTime

    console.log('Time verification:', {
      txTime,
      currentTime,
      differenceInSeconds: timeDiff
    })

    if (timeDiff > 600) {
      throw new Error('Transaction too old')
    }

    // All verifications passed
    console.log('Transaction verified successfully')
    return NextResponse.json({
      success: true,
      verified: true,
      transaction: {
        hash: txHash,
        amount: txAmount,
        timestamp: txTime,
        sender: tx.in_msg.source,
        recipient: tx.in_msg.destination,
        details: {
          lt: tx.lt,
          fee: tx.total_fees,
          utime: tx.utime
        }
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