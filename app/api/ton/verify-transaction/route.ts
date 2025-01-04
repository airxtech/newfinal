// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TransactionType, TransactionStatus } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tokenId } = body

    if (!process.env.TONCONSOLE_API_KEY) {
      throw new Error('TON Console API key not configured')
    }

    // Create payment invoice
    const response = await fetch(
      'https://tonconsole.com/api/v1/services/invoices/invoice',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TONCONSOLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: '300000000', // 0.3 TON in nanotons
          life_time: 600, // 10 minutes
          currency: 'TON',
          description: `Token creation fee for token ${tokenId}`
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create payment invoice: ${error}`)
    }

    const invoice = await response.json()

    // Store invoice ID with token
    await prisma.token.update({
      where: { id: tokenId },
      data: {
        paymentInvoiceId: invoice.id
      }
    })

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        amount: invoice.amount,
        paymentLink: invoice.payment_link,
        expiresAt: invoice.date_expire
      }
    })

  } catch (error) {
    console.error('Payment setup error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to setup payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}