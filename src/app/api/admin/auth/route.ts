import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();

    if (!passcode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Passcode is required' 
      }, { status: 400 });
    }

    const adminPasscode = process.env.ADMIN_PASSCODE;

    console.log('🔍 Debug - adminPasscode from env:', adminPasscode);
    console.log('🔍 Debug - received passcode:', passcode);
    console.log('🔍 Debug - passcode match:', passcode === adminPasscode);

    if (!adminPasscode) {
      console.error('❌ ADMIN_PASSCODE not set in environment variables');
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    if (passcode !== adminPasscode) {
      console.log('❌ Passcode mismatch - expected:', adminPasscode, 'received:', passcode);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid passcode' 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Authentication successful' 
    });

  } catch (error) {
    console.error('❌ Error in admin auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}