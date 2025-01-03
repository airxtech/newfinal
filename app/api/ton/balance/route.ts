// app/api/ton/balance/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url)
      const address = searchParams.get('address')
      
      console.log('TON Balance API hit for address:', address) // Add this
  
      if (!address) {
        return NextResponse.json(
          { error: 'Address is required' },
          { status: 400 }
        )
      }
  
      console.log('Making request to TonCenter with API key:', process.env.TONCENTER_API_KEY ? 'Present' : 'Missing') // Add this
  
      const response = await fetch(
        `https://toncenter.com/api/v2/getAddressInformation?address=${address}`,
        {
          headers: {
            'accept': 'application/json',
            'X-API-Key': process.env.TONCENTER_API_KEY || ''
          }
        }
      )
  
      console.log('TonCenter response status:', response.status) // Add this
  
      if (!response.ok) {
        throw new Error(`TonCenter API Error: ${response.status}`)
      }
  
      const data = await response.json()
      console.log('TonCenter response data:', data) // Add this
      return NextResponse.json(data)
    } catch (error) {
      console.error('Balance fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      )
    }
  }