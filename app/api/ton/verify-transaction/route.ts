// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Log request start
    console.log('Starting transaction verification')

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json()
      console.log('Received request body:', body)
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { txHash, expectedAmount } = body

    // 3. Validate required fields
    if (!txHash) {
      console.error('Missing txHash in request')
      return NextResponse.json({ error: 'txHash is required' }, { status: 400 })
    }

    // 4. Check API key
    const apiKey = process.env.TONCENTER_API_KEY
    if (!apiKey) {
      console.error('TONCENTER_API_KEY not found in environment')
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    // 5. Log API call details
    const apiUrl = `https://toncenter.com/api/v2/getTransactions?address=${process.env.NEXT_PUBLIC_WALLET_ADDRESS}&limit=10`
    console.log('Calling TonCenter API:', apiUrl)

    // 6. Make API request
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey
        }
      })

      console.log('TonCenter API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('TonCenter API error response:', errorText)
        return NextResponse.json({
          error: 'TonCenter API error',
          details: errorText
        }, { status: 500 })
      }

      const data = await response.json()
      console.log('TonCenter API response data:', JSON.stringify(data, null, 2))

      // 7. Find matching transaction
      const matchingTx = data.result?.find((tx: any) => tx.transaction_id.hash === txHash)
      
      if (!matchingTx) {
        console.log('No matching transaction found for hash:', txHash)
        return NextResponse.json({
          error: 'Transaction not found',
          verified: false
        }, { status: 404 })
      }

      console.log('Found matching transaction:', matchingTx)

      // 8. Verify transaction details
      const txAmount = parseInt(matchingTx.in_msg.value) / 1e9
      const expectedTON = expectedAmount / 1e9

      console.log('Amount verification:', {
        txAmount,
        expectedTON,
        difference: Math.abs(txAmount - expectedTON)
      })

      if (Math.abs(txAmount - expectedTON) > 0.001) {
        return NextResponse.json({
          error: 'Invalid amount',
          verified: false,
          details: { expected: expectedTON, received: txAmount }
        }, { status: 400 })
      }

      // 9. Return success
      return NextResponse.json({
        success: true,
        verified: true,
        transaction: {
          hash: txHash,
          amount: txAmount,
          timestamp: matchingTx.utime,
          sender: matchingTx.in_msg.source,
          recipient: matchingTx.in_msg.destination
        }
      })

    } catch (apiError) {
      console.error('Error making TonCenter API request:', apiError)
      return NextResponse.json({
        error: 'Failed to verify with TonCenter',
        details: apiError instanceof Error ? apiError.message : 'Unknown API error'
      }, { status: 500 })
    }

  } catch (error) {
    // 10. Top-level error handler
    console.error('Verification endpoint error:', error)
    return NextResponse.json({
      error: 'Transaction verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}