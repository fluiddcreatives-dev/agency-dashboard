import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GHL preflight / health check
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  return NextResponse.json({ ok: true }, { headers: CORS });
}

// POST /api/webhooks/highlevel?secret=YOUR_SECRET
// Expected body from GHL Workflow custom webhook:
// { "companyName": "{{contact.company_name}}", "contactName": "{{contact.full_name}}" }
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
      // Try JSON first, fall back to text
      const text = await request.text();
      try { body = JSON.parse(text); } catch { body = Object.fromEntries(new URLSearchParams(text)); }
    }
  } catch {
    return NextResponse.json({ error: 'Could not parse body' }, { status: 400 });
  }

  // GHL sends contact data in various shapes — try all common locations
  const contact = (body.contact ?? {}) as Record<string, unknown>;
  const rawName = (
    body.companyName ??
    body.contactName ??
    contact.companyName ??
    contact.company_name ??
    contact.name ??
    body.name ??
    body.company_name ??
    ''
  ) as string;
  const companyName = rawName.trim();

  // Debug: return the full body if no name found (remove after debugging)
  if (!companyName) {
    return NextResponse.json({ error: 'No company name in payload', received: body }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Match client by name, case-insensitive
  const { data: matches, error: fetchError } = await supabase
    .from('clients')
    .select('id, name, flows_live_date')
    .ilike('name', companyName);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json(
      { error: `No client found matching "${companyName}"` },
      { status: 404 }
    );
  }

  const client = matches[0];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { error: updateError } = await supabase
    .from('clients')
    .update({ flows_live_date: today })
    .eq('id', client.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    client: client.name,
    flows_live_date: today,
  });
}
