import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phoneNumber, code } = body;

  try {
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_SERVICE_SID;
    const client = twilio(accountSid, authToken);

    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code,
      });

    if (verificationCheck.status === 'approved') {
      return NextResponse.json({ success: true, message: 'Verification successful!' });
    } else {
      return NextResponse.json({ success: false, message: 'Verification failed.' });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
