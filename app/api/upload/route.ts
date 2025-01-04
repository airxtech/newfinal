// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

// New way to configure the route
export const runtime = 'nodejs' // specify runtime
export const dynamic = 'force-dynamic' // disable static optimization

export async function POST(request: Request) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Log file details
    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public/uploads')
    try {
      await writeFile(path.join(process.cwd(), 'public/uploads/.keep'), '')
    } catch (error) {
      console.error('Error creating uploads directory:', error)
    }

    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const filepath = path.join(uploadDir, filename)

    console.log('Writing file to:', filepath)

    await writeFile(filepath, new Uint8Array(buffer))
    console.log('File written successfully')

    // Return the public URL
    const publicUrl = `/uploads/${filename}`
    return NextResponse.json({ 
      success: true,
      url: publicUrl
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}