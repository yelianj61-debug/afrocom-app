'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Wallet, Clock, CheckCircle, XCircle, Loader2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Withdrawal, Profile } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const schema = z.object({
  amount: z.number().min(1000, 'Montant minimum : 1 000 FCFA'),
  method: z.enum(['mobile_money', 'carte_bancaire', 'autre']),
})

type FormData = z.infer<typeof schema>

const methodLabels: Record<string, string> = {
  mobile_money: 'Mobile Money',
  carte_bancaire: 'Carte bancaire',
  autre: 'Autre',
}

const statusConfig = {
  en_attente: { icon: Clock, color: 'text-amber-500 bg-amber-50', label: 'En attente' },
  en_cours: { icon: Loader2, color: 'text-blue-500 bg-blue-50', label: 'En cours' },
  complete: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: 'Complété' },
  rejete: { icon: XCircle, color: 'text-red-500 bg-red-50', label: 'Rejeté' },
}

export default function RetraitPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { method: 'mobile_money' },
  })

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [profileRes, withdrawalsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setProfile(profileRes.data)
    setWithdrawals(withdrawalsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function onSubmit(data: FormData) {
    if (!profile || data.amount > profile.balance) {
      toast.error('Solde insuffisant')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('withdrawals').insert({
      user_id: user.id,
      amount: data.amount,
      currency: profile.currency,
      method: data.method,
    })

    if (error) {
      toast.error('Erreur lors de la demande')
    } else {
      toast.success('Demande de retrait envoyée ! Traitement sous 30 min.')
      reset()
      load()
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-dark mb-8">Retrait</h1>

      {/* Balance card */}
      <div className="gradient-card rounded-3xl p-6 text-white mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6" />
          <span className="font-semibold">Solde disponible</span>
        </div>
        <div className="text-4xl font-black">
          {formatCurrency(profile?.balance || 0, profile?.currency)}
        </div>
        <p className="text-blue-200 text-sm mt-1">Délai de traitement : maximum 30 minutes</p>
      </div>

      {/* Withdrawal form */}
      <div className="card p-6 mb-8">
        <h2 className="font-bold text-dark text-lg mb-5">Nouvelle demande de retrait</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Montant ({profile?.currency})</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              placeholder="Ex: 5000"
              min="1000"
              max={profile?.balance}
              className="input-field"
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="label">Méthode de retrait</label>
            <select {...register('method')} className="input-field">
              <option value="mobile_money">Mobile Money</option>
              <option value="carte_bancaire">Carte bancaire</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <button type="submit" disabled={submitting || (profile?.balance || 0) < 1000} className="btn-primary disabled:opacity-70">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Demander le retrait
          </button>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="font-bold text-dark text-lg mb-4">Historique des retraits</h2>
        {withdrawals.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun retrait effectué</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => {
              const config = statusConfig[w.status]
              const Icon = config.icon
              return (
                <div key={w.id} className="card p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-dark">{formatCurrency(w.amount, w.currency)}</div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      {methodLabels[w.method]} • {format(new Date(w.created_at), 'd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  <span className={`badge ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
