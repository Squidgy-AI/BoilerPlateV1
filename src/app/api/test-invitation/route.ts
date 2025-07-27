import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== TEST INVITATION API CALLED ===');
  
  try {
    const body = await request.json();
    console.log('Test API body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      received_data: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}