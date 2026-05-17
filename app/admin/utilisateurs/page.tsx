'use client'

import { useEffect, useState } from 'react'
import { Search, Users, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { getBadgeColor, getBadgeIcon, getBadgeLabel, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminUtilisateurs() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    u.referral_code?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">{users.length} membre{users.length > 1 ? 's' : ''} inscrit{users.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou code parrainage..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Badge</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Solde</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code parrainage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 gradient-card rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-dark text-sm">{user.first_name} {user.last_name}</div>
                          <div className="text-gray-400 text-xs">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getBadgeColor(user.badge_level)}`}>
                        {getBadgeIcon(user.badge_level)} {getBadgeLabel(user.badge_level)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-dark text-sm">
                        {formatCurrency(user.balance, user.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded-lg">
                        {user.referral_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(user.created_at), 'd MMM yyyy', { locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
