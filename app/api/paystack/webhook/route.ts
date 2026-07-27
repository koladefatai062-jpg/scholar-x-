import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const { reference, customer, metadata } = event.data
    const email = customer.email
    const userId = metadata?.user_id

    const supabase = createAdminClient()

    // Verify payment with Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const verifyData = await verifyRes.json()

    if (verifyData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const amount = verifyData.data.amount // in kobo
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Update user to premium
    if (userId) {
      await supabase.from('users').update({
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
      }).eq('id', userId)
    } else {
      // Fallback: find user by email
      await supabase.from('users').update({
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
      }).eq('email', email)
    }

    // Save payment record
    await supabase.from('payments').insert({
      user_id: userId,
      reference,
      amount,
      status: 'success',
      expires_at: expiresAt.toISOString(),
    })
  }

  return NextResponse.json({ received: true })
}