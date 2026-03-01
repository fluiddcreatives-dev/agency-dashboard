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

// POST /api/webhooks/upsell
// Expected body from Zapier:
// { "companyName": "Acme Corp", "recurringMrr": 3000 }
// recurringMrr = the monthly recurring amount they sold into
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

  const rawName = (
    body.companyName ??
    body.company_name ??
    body.name ??
    ''
  ) as string;
  const companyName = rawName.trim();

  if (!companyName) {
    return NextResponse.json({ error: 'No company name in payload', received: body }, { status: 400, headers: CORS });
  }

  const recurringMrr = Number(
    body.recurringMrr ?? body.recurring_mrr ?? body.upsellMrr ?? body.upsell_mrr ?? body.mrr ?? 0
  );

  if (!recurringMrr || recurringMrr <= 0) {
    return NextResponse.json({ error: 'recurringMrr must be a positive number' }, { status: 400, headers: CORS });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const now = new Date().toISOString();

  const supabase = createServiceClient();

  // Find the flow_setup client by name
  const { data: matches, error: fetchError } = await supabase
    .from('clients')
    .select('id, name, upsold')
    .ilike('name', companyName)
    .eq('client_type', 'flow_setup');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500, headers: CORS });
  }

  // No existing flow setup client — create one already marked as upsold
  if (!matches || matches.length === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('clients')
      .insert({
        name: companyName,
        client_type: 'flow_setup',
        status: 'active',
        start_date: today,
        monthly_spend: 0,
        notes: '',
        upsold: true,
        upsell_mrr: recurringMrr,
        upsell_date: today,
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
      created: true,
      client: inserted.name,
      upsell_date: today,
      upsell_mrr: recurringMrr,
    }, { headers: CORS });
  }

  const client = matches[0];

  // Already upsold — just return success, don't error
  if (client.upsold) {
    return NextResponse.json({
      success: true,
      already_upsold: true,
      client: client.name,
    }, { headers: CORS });
  }

  const { error: updateError } = await supabase
    .from('clients')
    .update({
      upsold: true,
      upsell_mrr: recurringMrr,
      upsell_date: today,
      updated_at: now,
    })
    .eq('id', client.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({
    success: true,
    client: client.name,
    upsell_date: today,
    upsell_mrr: recurringMrr,
  }, { headers: CORS });
}
