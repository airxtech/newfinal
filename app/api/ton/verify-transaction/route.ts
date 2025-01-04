// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'

interface TransactionResponse {
  ok: boolean;
  result: {
    transaction_id: {
      lt: string;
      hash: string;
    };
    utime: number;
    fee: string;
    storage_fee: string;
    other_fee: string;
    transaction_type: string;
    compute_skip_reason: string;
    compute_exit_code: number;
    compute_gas_used: number;
    compute_gas_limit: number;
    compute_gas_credit: number;
    compute_gas_fees: string;
    compute_vm_steps: number;
    action_result_code: number;
    action_fees: string;
    total_fees: string;
    in_msg: {
      source: string;
      destination: string;
      value: string;
      fwd_fee: string;
      ihr_fee: string;
      created_lt: string;
      body_hash: string;
    }
  }
}

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

    // Wait a few seconds for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Fetch transaction details from TON Center
    const response = await fetch(
      `https://toncenter.com/api/v2/getTransactionByHash?hash=${txHash}`,
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

    const data: TransactionResponse = await response.json()
    console.log('TonCenter API response data:', data)

    if (!data.ok || !data.result) {
      throw new Error('Transaction not found')
    }

    const tx = data.result

    // Verify destination address matches platform wallet
    if (tx.in_msg.destination !== process.env.NEXT_PUBLIC_WALLET_ADDRESS) {
      console.error('Address mismatch:', {
        expected: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
        received: tx.in_msg.destination
      })
      throw new Error('Invalid destination address')
    }

    // Verify amount (converting from nanoTON to TON)
    const txAmount = parseInt(tx.in_msg.value) / 1e9
    const expectedTON = expectedAmount / 1e9
    console.log('Amount verification:', { txAmount, expectedTON })

    if (Math.abs(txAmount - expectedTON) > 0.001) { // Allow 0.001 TON margin
      console.error('Amount mismatch:', {
        expected: expectedTON,
        received: txAmount,
        difference: Math.abs(txAmount - expectedTON)
      })
      throw new Error('Invalid transaction amount')
    }

    // Verify transaction is recent (within last 10 minutes)
    const txTime = tx.utime
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
        recipient: tx.in_msg.destination,
        fees: {
          total: tx.total_fees,
          storage: tx.storage_fee,
          other: tx.other_fee
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