// app/api/auth/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const BOT_TOKEN = process.env.BOT_TOKEN || ''

function validateTelegramWebAppData(data: string, botToken: string) {
  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const signature = crypto
    .createHmac('sha256', secret.toString('hex'))
    .update(data)
    .digest('hex')

  return signature
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData) {
      return NextResponse.json(
        { error: 'No init data provided' },
        { status: 400 }
      )
    }

    const parsedInitData = Object.fromEntries(new URLSearchParams(initData))
    const hash = parsedInitData.hash
    const data = Object.entries(parsedInitData)
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const generatedHash = validateTelegramWebAppData(data, BOT_TOKEN)

    if (generatedHash !== hash) {
      return NextResponse.json(
        { error: 'Invalid hash' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}