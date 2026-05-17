'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { User, Camera, Copy, Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { getBadgeColor, getBadgeIcon, getBadgeLabel } from '@/lib/utils'

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState({ formations: 0, attestations: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset } = useForm<{ first_name: string; last_name: string }>()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, purchasesRes, certsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'complete'),
        supabase.from('certificates').select('id', { count: 'exact' }).eq('user_id', user.id),
      ])

      setProfile({ ...profileRes.data, email: user.email })
      setStats({
        formations: purchasesRes.count || 0,
        attestations: certsRes.count || 0,
      })
      reset({ first_name: profileRes.data?.first_name, last_name: profileRes.data?.last_name })
      setLoading(false)
    }
    load()
  }, [reset])

  async function onSubmit(data: { first_name: string; last_name: string }) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ first_name: data.first_name, last_name: data.last_name })
      .eq('id', user.id)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success('Profil mis à jour !')
      setProfile(prev => prev ? { ...prev, ...data } : prev)
    }
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'avatars')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
        setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)
        toast.success('Photo de profil mise à jour !')
      }
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
    setUploading(false)
  }

  function copyReferralCode() {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code)
      toast.success('Code copié !')
    }
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
      <h1 className="text-2xl font-bold text-dark mb-8">Mon profil</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Avatar card */}
        <div className="card p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-100" />
            ) : (
              <div className="w-24 h-24 gradient-card rounded-full flex items-center justify-center ring-4 ring-primary-100">
                <span className="text-white text-3xl font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </span>
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <h2 className="font-bold text-dark">{profile?.first_name} {profile?.last_name}</h2>
          <p className="text-gray-400 text-sm mb-3">{profile?.email}</p>
          <span className={`badge ${getBadgeColor(profile?.badge_level || 'debutant')}`}>
            {getBadgeIcon(profile?.badge_level || 'debutant')} {getBadgeLabel(profile?.badge_level || 'debutant')}
          </span>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="card p-5 text-center">
            <div className="text-3xl font-black text-primary-600 mb-1">{stats.formations}</div>
            <div className="text-gray-500 text-sm">Formation{stats.formations > 1 ? 's' : ''} achetée{stats.formations > 1 ? 's' : ''}</div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-black text-accent-500 mb-1">{stats.attestations}</div>
            <div className="text-gray-500 text-sm">Attestation{stats.attestations > 1 ? 's' : ''}</div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-2xl font-black text-green-600 mb-1">
              {profile?.balance?.toLocaleString('fr-FR') || 0} {profile?.currency}
            </div>
            <div className="text-gray-500 text-sm">Solde disponible</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-gray-400 mb-1">Code de parrainage</div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-dark text-sm bg-primary-50 px-3 py-1.5 rounded-lg flex-1 text-center">
                {profile?.referral_code}
              </span>
              <button
                onClick={copyReferralCode}
                className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center hover:bg-primary-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card p-6">
        <h3 className="font-bold text-dark text-lg mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          Modifier mes informations
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input {...register('first_name')} className="input-field" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input {...register('last_name')} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-70">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  )
}
