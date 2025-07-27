import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }
  
  try {
    // Get all invitations with this token
    const { data: invitations, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      token,
      count: invitations.length,
      invitations: invitations.map(inv => ({
        id: inv.id,
        status: inv.status,
        recipient_email: inv.recipient_email,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        expired: new Date(inv.expires_at) < new Date(),
        sender_id: inv.sender_id,
        sender_company_id: inv.sender_company_id
      }))
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}