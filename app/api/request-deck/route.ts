/**
 * GET /api/request-deck/status?jobId=xxx — Poll R2 for deck generation result
 */

import { NextRequest, NextResponse } from 'next/server'

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json(
      { status: 'error', error: 'jobId is required' },
      { status: 400 }
    )
  }

  // Validate jobId format to prevent path traversal
  if (!/^job_\d+_[a-z0-9]+$/.test(jobId)) {
    return NextResponse.json(
      { status: 'error', error: 'Invalid jobId format' },
      { status: 400 }
    )
  }

  if (!R2_PUBLIC_URL) {
    return NextResponse.json(
      { status: 'error', error: 'R2 storage not configured' },
      { status: 500 }
    )
  }

  try {
    const r2Url = `${R2_PUBLIC_URL}/jobs/${jobId}.json`
    const res = await fetch(r2Url, { cache: 'no-store' })

    // 404 = n8n hasn't written the result yet
    if (res.status === 404 || res.status === 403) {
      return NextResponse.json({ status: 'processing' })
    }

    if (!res.ok) {
      console.error(`[request-deck/status] R2 fetch error: ${res.status}`)
      return NextResponse.json({ status: 'processing' })
    }

    const data = await res.json()

    if (data.success === false || data.error) {
      return NextResponse.json({
        status: 'error',
        error: data.error || 'Deck generation failed',
      })
    }

    // Validate expected fields
    if (!data.topic_id || !data.topic_name) {
      return NextResponse.json({
        status: 'error',
        error: 'Unexpected response from AI — missing topic data',
      })
    }

    return NextResponse.json({
      status: 'complete',
      data,
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ status: 'processing' })
  }
}
