// app/api/ton-proof/account-info/route.ts
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network')
    const authHeader = request.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
      
      // Here you would fetch account info from your database
      // For now, return some mock data
      return NextResponse.json({
        address: decoded.address,
        network: decoded.network,
        balance: '0',
        lastSeen: new Date(),
        // Add any other account info you want to return
      })
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error getting account info:', error)
    return NextResponse.json(
      { error: 'Failed to get account info' },
      { status: 500 }
    )
  }
}