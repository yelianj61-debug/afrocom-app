'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Clock, CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Withdrawal } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const methodLabels: Record<string, string> = {
  mobile_money: '📱 Mobile Money',
  carte_bancaire: '💳 Carte bancaire',
  autre: '🔄 Autre',
}

type FilterStatus = 'all' | 'en_attente' | 'complete' | 'rejete'

export default function AdminRetraits() {
  const [withdrawals, setWithdrawals] = useState<(Withdrawal & { profiles: { first_name: string; last_name: string } | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('en_attente')
  const [processing, setProcessing] = useState<string | null>(null)

  async function load() {
    const supabase = createClient()
    const query = supabase
      .from('withdrawals')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') query.eq('status', filter)

    const { data } = await query
    setWithdrawals(data || [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  async function handleAction(id: string, userId: string, amount: number, action: 'complete' | 'rejete') {
    setProcessing(id)
    const supabase = createClient()

    const { error } = await supabase
      .from('withdrawals')
      .update({ status: action, processed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
      setProcessing(null)
      return
    }

    if (action === 'complete') {
      // Deduct balance from user
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({ balance: Math.max(0, Number(profile.balance) - amount) })
          .eq('id', userId)
      }
      toast.success('Retrait validé et solde déduit !')
    } else {
      toast.success('Retrait rejeté')
    }

    load()
    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Demandes de retrait</h1>
        <p className="text-gray-500 mt-1">Gérez les demandes de retrait des utilisateurs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { value: 'en_attente', label: '⏳ En attente' },
          { value: 'complete', label: '✅ Complétés' },
          { value: 'rejete', label: '❌ Rejetés' },
          { value: 'all', label: 'Tous' },
        ] as { value: FilterStatus; label: string }[]).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === f.value
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {withdrawals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune demande de retrait</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-bold text-dark">
                      {w.profiles?.first_name} {w.profiles?.last_name}
                    </div>
                    <div className="text-2xl font-black text-primary-600 mt-0.5">
                      {formatCurrency(w.amount, w.currency)}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {methodLabels[w.method]} • {format(new Date(w.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {w.status === 'en_attente' && (
                    <>
                      <button
                        onClick={() => handleAction(w.id, w.user_id, w.amount, 'rejete')}
                        disabled={processing === w.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeter
                      </button>
                      <button
                        onClick={() => handleAction(w.id, w.user_id, w.amount, 'complete')}
                        disabled={processing === w.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {processing === w.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Valider
                      </button>
                    </>
                  )}
                  {w.status === 'complete' && (
                    <span className="badge text-green-600 bg-green-50">
                      <CheckCircle className="w-4 h-4" /> Validé
                    </span>
                  )}
                  {w.status === 'rejete' && (
                    <span className="badge text-red-500 bg-red-50">
                      <XCircle className="w-4 h-4" /> Rejeté
                    </span>
                  )}
                  {w.status === 'en_cours' && (
                    <span className="badge text-blue-500 bg-blue-50">
                      <Clock className="w-4 h-4" /> En cours
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
