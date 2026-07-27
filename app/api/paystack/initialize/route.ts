import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('email, is_premium')
    .eq('id', user.id)
    .single()

  if (profile?.is_premium) {
    return NextResponse.json({ error: 'Already premium' }, { status: 400 })
  }

  // Initialize transaction with Paystack
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: profile?.email,
      amount: 500000, // ₦5,000 in kobo
      currency: 'NGN',
      metadata: { user_id: user.id },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })

  const data = await res.json()

  if (!data.status) {
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }

  return NextResponse.json({
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
  })
}