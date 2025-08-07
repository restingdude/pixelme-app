import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStatus } from '../../../../lib/rateLimitStore';

export async function GET(request: NextRequest) {
  try {
    // Get client IP address
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';

    const status = getRateLimitStatus(clientIP);

    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    return NextResponse.json(
      { error: 'Failed to get rate limit status' },
      { status: 500 }
    );
  }
}
