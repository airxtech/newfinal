// app/api/test/update-price/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Manual price update triggered');
    
    if (!process.env.TONCENTER_API_KEY) {
      throw new Error('TONCENTER_API_KEY not configured');
    }
    
    // Using the correct endpoint for TON price
    const response = await fetch('https://toncenter.com/api/v2/jrpc', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.TONCENTER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "id": "1",
        "jsonrpc": "2.0",
        "method": "getTokenData",
        "params": []
      })
    });

    console.log('API Response status:', response.status); // Debug log

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Received data:', data); // Debug log

    // Check if we have a valid result
    if (!data.result?.price_usd && data.result?.price_usd !== 0) {
      throw new Error('No price data in response');
    }

    const price = data.result.price_usd;

    const result = await prisma.tonPrice.upsert({
      where: { id: 'current' },
      update: { price, timestamp: new Date() },
      create: { id: 'current', price, timestamp: new Date() }
    });

    return NextResponse.json({ 
      success: true, 
      price, 
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual price update failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}