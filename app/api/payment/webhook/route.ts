import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const event = body.name || body.event
  const transaction = body.data?.object?.transaction || body.transaction

  if (!transaction) {
    return NextResponse.json({ received: true })
  }

  const supabase = await createClient()

  if (event === 'transaction.approved' || transaction.status === 'approved') {
    const transactionId = String(transaction.id)
    const purchaseId = transaction.meta?.purchase_id

    // Update purchase status
    const query = supabase
      .from('purchases')
      .update({ status: 'complete' })

    if (purchaseId) {
      await query.eq('id', purchaseId)
    } else {
      await query.eq('transaction_id', transactionId)
    }

    // Process referral earning (trigger handles this, but ensure balance update)
    const { data: purchase } = await supabase
      .from('purchases')
      .select('user_id, course_id')
      .eq('transaction_id', transactionId)
      .single()

    if (purchase) {
      // Get referrer
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', purchase.user_id)
        .single()

      if (profile?.referred_by) {
        // Add 1000 FCFA to referrer balance
        const { data: referrer } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', profile.referred_by)
          .single()

        if (referrer) {
          await supabase
            .from('profiles')
            .update({ balance: Number(referrer.balance) + 1000 })
            .eq('id', profile.referred_by)
        }
      }
    }
  } else if (event === 'transaction.canceled' || transaction.status === 'canceled') {
    const transactionId = String(transaction.id)
    await supabase
      .from('purchases')
      .update({ status: 'echoue' })
      .eq('transaction_id', transactionId)
  }

  return NextResponse.json({ received: true })
}

// Also handle GET for redirect-based confirmation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const purchaseId = searchParams.get('purchase_id')
  const token = searchParams.get('id')

  if (!purchaseId && !token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const supabase = await createClient()

  if (purchaseId) {
    // Verify with FedaPay API
    const { data: purchase } = await supabase
      .from('purchases')
      .select('transaction_id')
      .eq('id', purchaseId)
      .single()

    if (purchase?.transaction_id) {
      const verifyRes = await fetch(
        `https://api.fedapay.com/v1/transactions/${purchase.transaction_id}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.FEDAPAY_SECRET_KEY}` },
        }
      )
      if (verifyRes.ok) {
        const data = await verifyRes.json()
        const status = data.v1?.transaction?.status || data.transaction?.status
        if (status === 'approved') {
          await supabase
            .from('purchases')
            .update({ status: 'complete' })
            .eq('id', purchaseId)
        }
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard/formations?payment=success', request.url))
}
