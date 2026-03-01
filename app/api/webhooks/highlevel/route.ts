import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/webhooks/highlevel?secret=YOUR_SECRET
// Expected body from GHL Workflow custom webhook:
// { "companyName": "{{contact.company_name}}", "contactName": "{{contact.full_name}}" }
export async function POST(request: NextRequest) {
  // Verify secret token
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Accept companyName (preferred) or fall back to contactName
  const rawName = (body.companyName ?? body.contactName ?? '') as string;
  const companyName = rawName.trim();

  if (!companyName) {
    return NextResponse.json({ error: 'No company name in payload' }, { status: 400 });
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
