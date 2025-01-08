// app/api/ton/balance/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    if (!process.env.TONCENTER_API_KEY) {
      throw new Error('API key configuration error')
    }

    const response = await fetch(
      `https://toncenter.com/api/v2/getAddressInformation?address=${address}`,
      {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.TONCENTER_API_KEY
        }
      }
    )

    if (!response.ok) {
      throw new Error(`TonCenter API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Balance fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}