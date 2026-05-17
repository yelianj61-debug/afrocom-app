'use client'

import { useEffect, useState } from 'react'
import { Users, ShoppingCart, TrendingUp, Clock, Loader2, BookOpen, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  total_users: number
  total_purchases: number
  total_revenue: number
  pending_withdrawals: number
  pending_certificates: number
  published_courses: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [usersRes, purchasesRes, revenueRes, withdrawalsRes, certsRes, coursesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('purchases').select('id', { count: 'exact' }).eq('status', 'complete'),
        supabase.from('purchases').select('amount').eq('status', 'complete'),
        supabase.from('withdrawals').select('id', { count: 'exact' }).eq('status', 'en_attente'),
        supabase.from('certificates').select('id', { count: 'exact' }).is('certificate_url', null),
        supabase.from('courses').select('id', { count: 'exact' }).eq('is_published', true),
      ])

      const totalRevenue = (revenueRes.data || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

      setStats({
        total_users: usersRes.count || 0,
        total_purchases: purchasesRes.count || 0,
        total_revenue: totalRevenue,
        pending_withdrawals: withdrawalsRes.count || 0,
        pending_certificates: certsRes.count || 0,
        published_courses: coursesRes.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const cards = [
    { icon: Users, label: 'Utilisateurs', value: stats?.total_users.toLocaleString() || '0', color: 'bg-blue-500', bg: 'bg-blue-50' },
    { icon: ShoppingCart, label: 'Achats complétés', value: stats?.total_purchases.toLocaleString() || '0', color: 'bg-green-500', bg: 'bg-green-50' },
    { icon: TrendingUp, label: 'Revenus totaux', value: formatCurrency(stats?.total_revenue || 0), color: 'bg-accent-500', bg: 'bg-amber-50' },
    { icon: BookOpen, label: 'Formations publiées', value: stats?.published_courses.toLocaleString() || '0', color: 'bg-purple-500', bg: 'bg-purple-50' },
    { icon: Clock, label: 'Retraits en attente', value: stats?.pending_withdrawals.toLocaleString() || '0', color: 'bg-red-500', bg: 'bg-red-50', alert: (stats?.pending_withdrawals || 0) > 0 },
    { icon: Award, label: 'Attestations à envoyer', value: stats?.pending_certificates.toLocaleString() || '0', color: 'bg-indigo-500', bg: 'bg-indigo-50', alert: (stats?.pending_certificates || 0) > 0 },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de la plateforme RIVO</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(({ icon: Icon, label, value, color, bg, alert }) => (
          <div key={label} className={`card p-5 ${alert ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
              </div>
              {alert && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  Action requise
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-dark mb-1">{value}</div>
            <div className="text-gray-500 text-sm">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="font-bold text-dark text-lg mb-4">Actions rapides</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <a href="/admin/formations" className="card p-5 hover:shadow-xl transition-shadow group">
            <BookOpen className="w-8 h-8 text-primary-600 mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-dark">Ajouter une formation</div>
            <div className="text-gray-400 text-sm mt-1">Publier un nouveau cours</div>
          </a>
          <a href="/admin/retraits" className="card p-5 hover:shadow-xl transition-shadow group">
            <Clock className="w-8 h-8 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-dark">Valider les retraits</div>
            <div className="text-gray-400 text-sm mt-1">{stats?.pending_withdrawals} retrait(s) en attente</div>
          </a>
          <a href="/admin/attestations" className="card p-5 hover:shadow-xl transition-shadow group">
            <Award className="w-8 h-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-dark">Envoyer attestations</div>
            <div className="text-gray-400 text-sm mt-1">{stats?.pending_certificates} attestation(s) à envoyer</div>
          </a>
        </div>
      </div>
    </div>
  )
}
