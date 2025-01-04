// app/api/ton/payment-status/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    const response = await fetch(
      `https://tonconsole.com/api/v1/services/invoices/${invoiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TONCONSOLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to check payment status')
    }

    const invoice = await response.json()

    return NextResponse.json({
      paid: invoice.status === 'paid',
      status: invoice.status,
      paidBy: invoice.paid_by_address
    })

  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}