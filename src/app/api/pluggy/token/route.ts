import { NextResponse } from 'next/server'
import { connectToken } from '@/lib/pluggy'

export async function GET() {
  try {
    const token = await connectToken()
    return NextResponse.json({ token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
