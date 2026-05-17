import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { course_id, user_id, amount, currency, course_title } = await request.json()

  const supabase = await createClient()

  // Create pending purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      user_id,
      course_id,
      amount,
      currency,
      status: 'en_attente',
      payment_method: 'fedapay',
    })
    .select()
    .single()

  if (purchaseError) {
    return NextResponse.json({ error: 'Erreur lors de la création de l\'achat' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Create FedaPay transaction
  const fedapayRes = await fetch('https://api.fedapay.com/v1/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: `RIVO - ${course_title}`,
      amount,
      currency: { iso: currency === 'XOF' ? 'XOF' : currency },
      callback_url: `${siteUrl}/api/payment/webhook`,
      redirect_url: `${siteUrl}/dashboard/formations?payment=success&purchase_id=${purchase.id}`,
      meta: {
        purchase_id: purchase.id,
        user_id,
        course_id,
      },
    }),
  })

  if (!fedapayRes.ok) {
    const errText = await fedapayRes.text()
    console.error('FedaPay error:', errText)
    return NextResponse.json({ error: 'Erreur FedaPay' }, { status: 500 })
  }

  const fedapayData = await fedapayRes.json()
  const transactionId = fedapayData.v1?.transaction?.id || fedapayData.transaction?.id

  if (!transactionId) {
    return NextResponse.json({ error: 'Transaction ID manquant' }, { status: 500 })
  }

  // Update purchase with transaction ID
  await supabase
    .from('purchases')
    .update({ transaction_id: String(transactionId) })
    .eq('id', purchase.id)

  // Generate payment token
  const tokenRes = await fetch(`https://api.fedapay.com/v1/transactions/${transactionId}/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Erreur génération token' }, { status: 500 })
  }

  const tokenData = await tokenRes.json()
  const token = tokenData.v1?.token?.token || tokenData.token?.token || tokenData.token

  const payment_url = `https://checkout.fedapay.com/${token}`

  return NextResponse.json({ payment_url, purchase_id: purchase.id })
}
