import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'

export async function GET() {
  // Protect: only allow in development with explicit flag
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Mongo status endpoint not available in production' },
      { status: 403 }
    )
  }

  if (process.env.ALLOW_DEV_SEED !== 'true') {
    return NextResponse.json(
      { error: 'Mongo status endpoint disabled. Set ALLOW_DEV_SEED=true to enable.' },
      { status: 403 }
    )
  }

  try {
    const db = await getMongoDb()
    await db.command({ ping: 1 })
    
    return NextResponse.json(
      { ok: true, db: db.databaseName },
      { status: 200 }
    )
  } catch (error: any) {
    // Log full error with stack trace
    console.error('Error pinging MongoDB:', error)
    if (error?.stack) {
      console.error('Stack trace:', error.stack)
    }

    // Return detailed error only in development
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to connect to MongoDB',
        ...(isDev && { details: error?.message ?? String(error) }),
      },
      { status: 500 }
    )
  }
}

