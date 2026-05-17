'use client'

import { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Award, Upload, Send, Loader2, CheckCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PurchaseWithDetails {
  id: string
  user_id: string
  course_id: string
  purchased_at: string
  courses: { title: string } | null
  profiles: { first_name: string; last_name: string } | null
  has_certificate: boolean
}

export default function AdminAttestations() {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function loadPurchases() {
    const supabase = createClient()
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('id, user_id, course_id, purchased_at, courses(title), profiles(first_name, last_name)')
      .eq('status', 'complete')
      .order('purchased_at', { ascending: false })

    const { data: certsData } = await supabase
      .from('certificates')
      .select('user_id, course_id')

    const certSet = new Set((certsData || []).map((c: { user_id: string; course_id: string }) => `${c.user_id}_${c.course_id}`))

    const enriched = (purchasesData || []).map((p) => ({
      ...p,
      courses: Array.isArray(p.courses) ? p.courses[0] : p.courses,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      has_certificate: certSet.has(`${p.user_id}_${p.course_id}`),
    }))

    setPurchases(enriched)
    setLoading(false)
  }

  useEffect(() => { loadPurchases() }, [])

  async function uploadPdf(purchaseId: string, file: File) {
    setUploadingFor(purchaseId)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'afrotv_videos')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      setPdfUrls(prev => ({ ...prev, [purchaseId]: url }))
      toast.success('PDF téléchargé !')
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
    setUploadingFor(null)
  }

  async function sendCertificate(purchase: PurchaseWithDetails) {
    setSending(purchase.id)
    const supabase = createClient()

    const { error } = await supabase.from('certificates').insert({
      user_id: purchase.user_id,
      course_id: purchase.course_id,
      certificate_url: pdfUrls[purchase.id] || null,
      message: messages[purchase.id] || 'Félicitations, veuillez bien démarrer votre apprentissage...',
    })

    if (error) {
      toast.error('Erreur lors de l\'envoi')
    } else {
      toast.success('Attestation envoyée !')
      loadPurchases()
    }
    setSending(null)
  }

  const pending = purchases.filter(p => !p.has_certificate)
  const sent = purchases.filter(p => p.has_certificate)

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
        <h1 className="text-2xl font-bold text-dark">Attestations</h1>
        <p className="text-gray-500 mt-1">{pending.length} en attente • {sent.length} envoyée{sent.length > 1 ? 's' : ''}</p>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-dark text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" />
            À envoyer ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-dark">{p.profiles?.first_name} {p.profiles?.last_name}</div>
                    <div className="text-gray-500 text-sm">{p.courses?.title}</div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      Acheté le {format(new Date(p.purchased_at), 'd MMM yyyy', { locale: fr })}
                    </div>

                    <div className="mt-3 space-y-2">
                      <textarea
                        placeholder="Message personnalisé (optionnel)"
                        value={messages[p.id] || ''}
                        onChange={(e) => setMessages(prev => ({ ...prev, [p.id]: e.target.value }))}
                        rows={2}
                        className="input-field text-sm resize-none"
                      />

                      <div className="flex items-center gap-3">
                        {pdfUrls[p.id] ? (
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg flex-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700">PDF prêt</span>
                            <button onClick={() => setPdfUrls(prev => { const n = { ...prev }; delete n[p.id]; return n })} className="ml-auto text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileRefs.current[p.id]?.click()}
                            disabled={uploadingFor === p.id}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-colors"
                          >
                            {uploadingFor === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Ajouter PDF
                          </button>
                        )}
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          ref={(el) => { fileRefs.current[p.id] = el }}
                          onChange={(e) => e.target.files?.[0] && uploadPdf(p.id, e.target.files[0])}
                        />
                        <button
                          onClick={() => sendCertificate(p)}
                          disabled={sending === p.id}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-70"
                        >
                          {sending === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Envoyer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <h2 className="font-bold text-dark text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
            Déjà envoyées ({sent.length})
          </h2>
          <div className="space-y-3">
            {sent.map((p) => (
              <div key={p.id} className="card p-4 flex items-center gap-4 opacity-75">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-dark text-sm">{p.profiles?.first_name} {p.profiles?.last_name}</div>
                  <div className="text-gray-400 text-xs">{p.courses?.title}</div>
                </div>
                <span className="badge text-green-600 bg-green-50 text-xs">Envoyée</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {purchases.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Aucun achat complété pour l&apos;instant</p>
        </div>
      )}
    </div>
  )
}
