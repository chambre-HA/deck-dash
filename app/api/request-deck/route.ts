import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic_id, topic_name, count } = body;

    console.log('Received request:', { topic_id, topic_name, count });

    // Validate input
    if (!topic_id || !topic_name) {
      console.log('Validation failed: Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (count < 10 || count > 50) {
      console.log('Validation failed: Invalid count', count);
      return NextResponse.json(
        { success: false, error: 'Card count must be between 10 and 50' },
        { status: 400 }
      );
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return NextResponse.json(
        { success: false, error: 'Service not configured' },
        { status: 500 }
      );
    }

    // Forward request to n8n webhook (responds immediately with jobId)
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic_id,
        topic_name,
        count: count || 30,
      }),
    });

    if (!response.ok) {
      console.error('n8n webhook failed:', response.statusText);
      return NextResponse.json(
        { success: false, error: 'Failed to submit request' },
        { status: 500 }
      );
    }

    const result = await response.json();

    // n8n now returns { jobId, estimatedSeconds } immediately
    if (!result.jobId) {
      console.error('n8n did not return a jobId:', result);
      return NextResponse.json(
        { success: false, error: 'Unexpected response from automation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      estimatedSeconds: result.estimatedSeconds || 180,
      topic_id,
      topic_name,
      count,
    });
  } catch (error) {
    console.error('Error processing deck request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
