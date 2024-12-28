// app/api/ton-proof/check/route.ts
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'  // Make sure to set this in your environment variables

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { address, network, proof } = body

    // Here you would verify the proof using TON libraries
    // For now, we'll just generate a token
    const token = jwt.sign(
      { 
        address,
        network,
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error checking proof:', error)
    return NextResponse.json(
      { error: 'Failed to verify proof' },
      { status: 500 }
    )
  }
}