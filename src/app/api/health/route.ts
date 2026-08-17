import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Protected diagnostics endpoint.
//
// Usage:  curl -H "x-debug-key: $ADMIN_DEBUG_KEY" https://your-app.vercel.app/api/health
//
// Set ADMIN_DEBUG_KEY in your Vercel project's Environment Variables to any
// random string. Without it (or with the wrong key), this route reveals only
// that it's alive — nothing about the database.
export async function GET(req: NextRequest) {
  const requiredKey = process.env.ADMIN_DEBUG_KEY
  const providedKey = req.headers.get('x-debug-key')

  if (!requiredKey || providedKey !== requiredKey) {
    return NextResponse.json({ status: 'ok' })
  }

  try {
    const userCount = await db.user.count()
    const activeEmails = await db.user.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true, role: true, status: true },
      take: 20,
    })

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount,
      activeUsers: activeEmails,
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
        nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
