// app/api/ton/balance/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    console.log('TON Balance API hit for address:', address)

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    if (!process.env.TONCENTER_API_KEY) {
      console.error('TONCENTER_API_KEY not found in environment variables')
      throw new Error('API key configuration error')
    }

    console.log('Making request to TonCenter for address:', address)

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
      console.error('TonCenter API error:', response.status)
      throw new Error(`TonCenter API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log('TonCenter response received')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Balance fetch error:', error)
    // Return more specific error information
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}