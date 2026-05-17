'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { BookOpen, Mail, Lock, User, Calendar, Gift, Eye, EyeOff, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  first_name: z.string().min(2, 'Prénom requis (min 2 caractères)'),
  last_name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  birth_date: z.string().min(1, 'Date de naissance requise'),
  password: z.string().min(8, 'Mot de passe (min 8 caractères)'),
  confirm_password: z.string(),
  referral_code: z.string().optional(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen gradient-hero" />}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      referral_code: searchParams.get('ref') || '',
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    // Find referrer if code provided
    let referredById: string | null = null
    if (data.referral_code) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', data.referral_code.toUpperCase())
        .single()
      referredById = referrer?.id || null
      if (!referredById) {
        toast.error('Code de parrainage invalide')
        setLoading(false)
        return
      }
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          birth_date: data.birth_date,
          referred_by: referredById,
        },
      },
    })

    if (error) {
      toast.error(error.message || 'Erreur lors de l\'inscription')
      setLoading(false)
      return
    }

    if (authData.user && referredById) {
      await supabase
        .from('profiles')
        .update({ referred_by: referredById })
        .eq('id', authData.user.id)
    }

    if (authData.user) {
      await supabase
        .from('profiles')
        .update({ birth_date: data.birth_date })
        .eq('id', authData.user.id)
    }

    toast.success('Compte créé avec succès ! Bienvenue sur RIVO 🎉')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-black text-white">RIVO</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Créer un compte</h1>
          <p className="text-blue-200 mt-1">Rejoignez des milliers d&apos;apprenants</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input {...register('first_name')} placeholder="Jean" className="input-field pl-11" />
                </div>
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="label">Nom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input {...register('last_name')} placeholder="Dupont" className="input-field pl-11" />
                </div>
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input {...register('email')} type="email" placeholder="votre@email.com" className="input-field pl-11" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Date de naissance</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input {...register('birth_date')} type="date" className="input-field pl-11" />
              </div>
              {errors.birth_date && <p className="text-red-500 text-xs mt-1">{errors.birth_date.message}</p>}
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('confirm_password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pl-11"
                />
              </div>
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <div>
              <label className="label">Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input {...register('referral_code')} placeholder="Ex: RIVO2024" className="input-field pl-11 uppercase" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full justify-center text-base py-3.5 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </span>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Créer mon compte
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-5 text-sm">
            Déjà inscrit ?{' '}
            <Link href="/auth/login" className="text-primary-600 font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
// RegisterPage wraps in Suspense above
