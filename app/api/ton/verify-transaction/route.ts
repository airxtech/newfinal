import { NextResponse } from 'next/server'

interface TonTransactionResponse {
  transactions: Array<{
    hash: string
    in_msg: {
      source: string
      destination: string
      value: string
      created_at: string
    }
  }>
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { txHash, expectedAmount } = body

    console.log('Verifying transaction:', { txHash, expectedAmount })

    if (!txHash) {
      console.error('Missing txHash')
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      )
    }

    if (!process.env.TONCENTER_API_KEY) {
      console.error('TONCENTER_API_KEY not found')
      throw new Error('API key configuration error')
    }

    // Log the URL we're about to call
    const apiUrl = `https://toncenter.com/api/v3/transactions?hash=${txHash}`
    console.log('Calling TonCenter API:', apiUrl)

    // Wait a few seconds for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 3000))

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': process.env.TONCENTER_API_KEY
      }
    })

    console.log('TonCenter API response status:', response.status)

    if (!response.ok) {
      console.error('TonCenter API error:', {
        status: response.status,
        statusText: response.statusText
      })
      const errorText = await response.text()
      console.error('Error response body:', errorText)
      throw new Error(`TonCenter API Error: ${response.status} - ${errorText}`)
    }

    const data: TonTransactionResponse = await response.json()
    console.log('TonCenter API response data:', data)

    // Check if transaction exists
    if (!data.transactions || data.transactions.length === 0) {
      console.error('No transactions found for hash:', txHash)
      throw new Error('Transaction not found')
    }

    const tx = data.transactions[0]
    console.log('Found transaction:', tx)

    // Verify destination address matches platform wallet
    if (tx.in_msg.destination !== process.env.NEXT_PUBLIC_WALLET_ADDRESS) {
      console.error('Address mismatch:', {
        expected: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
        received: tx.in_msg.destination
      })
      throw new Error('Invalid destination address')
    }

    // Verify amount
    const txAmount = parseInt(tx.in_msg.value) / 1e9
    const expectedTON = expectedAmount / 1e9
    console.log('Amount verification:', { txAmount, expectedTON })

    if (Math.abs(txAmount - expectedTON) > 0.001) {
      console.error('Amount mismatch:', {
        expected: expectedTON,
        received: txAmount,
        difference: Math.abs(txAmount - expectedTON)
      })
      throw new Error('Invalid transaction amount')
    }

    // Verify transaction time
    const txTime = parseInt(tx.in_msg.created_at)
    const currentTime = Math.floor(Date.now() / 1000)
    console.log('Time verification:', { txTime, currentTime })

    if (currentTime - txTime > 600) {
      console.error('Transaction too old:', {
        txTime,
        currentTime,
        difference: currentTime - txTime
      })
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