import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  return NextResponse.json({ ok: true }, { headers: CORS });
}

// POST /api/webhooks/onboard
// Expected body from Zapier:
// { "companyName": "Acme Corp", "setupFee": 1500 }
// setupFee is optional (defaults to 0)
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      const text = await request.text();
      try { body = JSON.parse(text); } catch { body = Object.fromEntries(new URLSearchParams(text)); }
    }
  } catch {
    return NextResponse.json({ error: 'Could not parse body' }, { status: 400, headers: CORS });
  }

  // Extract company name from common field names
  const rawName = (
    body.companyName ??
    body.company_name ??
    body.name ??
    body.contactName ??
    body.contact_name ??
    ''
  ) as string;
  const companyName = rawName.trim();

  if (!companyName) {
    return NextResponse.json({ error: 'No company name in payload', received: body }, { status: 400, headers: CORS });
  }

  const setupFee = Number(body.setupFee ?? body.setup_fee ?? body.monthlySpend ?? body.monthly_spend ?? 0);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const now = new Date().toISOString();

  const supabase = createServiceClient();

  // Prevent duplicates — check if a flow_setup client with this name already exists
  const { data: existing } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', companyName)
    .eq('client_type', 'flow_setup');

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: `Flow setup client "${existing[0].name}" already exists`, id: existing[0].id },
      { status: 409, headers: CORS }
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('clients')
    .insert({
      name: companyName,
      client_type: 'flow_setup',
      status: 'active',
      start_date: today,
      monthly_spend: setupFee,
      notes: '',
      upsold: false,
      created_at: now,
      updated_at: now,
    })
    .select('id, name')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({
    success: true,
    client: inserted.name,
    id: inserted.id,
    start_date: today,
  }, { headers: CORS });
}
