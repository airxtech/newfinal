// app/api/ton-proof/generate-payload/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST() {
  try {
    // Generate a random payload
    const payload = crypto.randomBytes(32).toString('base64url')
    
    // Store the payload in database with timestamp for verification later
    // You might want to use prisma here to store the payload

    return NextResponse.json({ payload })
  } catch (error) {
    console.error('Error generating payload:', error)
    return NextResponse.json(
      { error: 'Failed to generate payload' },
      { status: 500 }
    )
  }
}