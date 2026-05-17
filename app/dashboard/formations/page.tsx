'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { BookOpen, Download, ExternalLink, Loader2, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Purchase } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function MesFormations() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('purchases')
        .select('*, courses(*)')
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .order('purchased_at', { ascending: false })
      setPurchases(data || [])
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark">Mes formations</h1>
        <p className="text-gray-500 mt-1">{purchases.length} formation{purchases.length > 1 ? 's' : ''} achetée{purchases.length > 1 ? 's' : ''}</p>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">Aucune formation achetée</h3>
          <p className="text-sm mb-6">Découvrez nos formations et commencez à apprendre dès aujourd&apos;hui.</p>
          <a href="/dashboard" className="btn-primary">
            <BookOpen className="w-5 h-5" />
            Voir les formations
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {purchases.map((purchase) => {
            const course = purchase.courses
            if (!course) return null
            return (
              <div key={purchase.id} className="card p-5">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl overflow-hidden">
                    {course.cover_image_url ? (
                      <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-dark mb-1 line-clamp-2">{course.title}</h3>
                    <p className="text-primary-600 font-semibold text-sm">{formatCurrency(purchase.amount, purchase.currency)}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Acheté le {format(new Date(purchase.purchased_at), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  {course.file_url && (
                    <a
                      href={course.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary py-2 px-3 text-sm justify-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Consulter
                    </a>
                  )}
                  {course.file_url && (
                    <a
                      href={course.file_url}
                      download
                      className="flex-1 btn-outline py-2 px-3 text-sm justify-center"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </a>
                  )}
                  {!course.file_url && (
                    <div className="flex-1 text-center py-2 text-sm text-gray-400 bg-gray-50 rounded-xl">
                      Fichier bientôt disponible
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
