'use client'

import { useEffect, useState } from 'react'
import { Award, Download, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Certificate } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Attestations() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('certificates')
        .select('*, courses(*)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false })
      setCertificates(data || [])
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark">Mes attestations</h1>
        <p className="text-gray-500 mt-1">{certificates.length} attestation{certificates.length > 1 ? 's' : ''}</p>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">Aucune attestation</h3>
          <p className="text-sm max-w-sm mx-auto">
            Vos attestations apparaîtront ici une fois que l&apos;administrateur les aura validées.
            Achetez une formation et progressez !
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="card p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-dark mb-1">{cert.courses?.title || 'Formation'}</h3>
                  <p className="text-gray-500 text-sm mb-1">
                    Délivré le {format(new Date(cert.issued_at), 'd MMMM yyyy', { locale: fr })}
                  </p>
                  {cert.message && (
                    <p className="text-gray-600 text-sm italic mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                      &ldquo;{cert.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                {cert.certificate_url ? (
                  <>
                    <a
                      href={cert.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary py-2 text-sm justify-center"
                    >
                      <FileText className="w-4 h-4" />
                      Voir
                    </a>
                    <a
                      href={cert.certificate_url}
                      download
                      className="flex-1 btn-outline py-2 text-sm justify-center"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger PDF
                    </a>
                  </>
                ) : (
                  <div className="flex-1 text-center py-2 text-sm text-amber-600 bg-amber-50 rounded-xl font-medium">
                    ⏳ En cours de préparation
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
