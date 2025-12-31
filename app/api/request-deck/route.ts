import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic_id, topic_name, count } = body;

    console.log('Received request:', { topic_id, topic_name, count });

    // Validate input
    if (!topic_id || !topic_name) {
      console.log('Validation failed: Missing required fields');
      return new NextResponse('Missing required fields', { status: 400 });
    }

    if (count < 10 || count > 50) {
      console.log('Validation failed: Invalid count', count);
      return new NextResponse('Card count must be between 10 and 50', { status: 400 });
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return new NextResponse('Service not configured', { status: 500 });
    }

    // Forward request to n8n webhook
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
      return new NextResponse('Failed to process request', { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Deck request submitted successfully',
      topic_id,
      topic_name,
      count,
    });
  } catch (error) {
    console.error('Error processing deck request:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
