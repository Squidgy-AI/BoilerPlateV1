import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phoneNumber } = body;

  try {
    // Use dynamic import for compatibility
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_SERVICE_SID;
    const client = twilio(accountSid, authToken);

    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        channel: 'sms',
        to: phoneNumber,
      });

    return NextResponse.json({ success: true, sid: verification.sid });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
