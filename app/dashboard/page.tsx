'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { BookOpen, ShoppingCart, Star, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course, Profile } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function DashboardBord() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, coursesRes, purchasesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('courses').select('*').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('purchases').select('course_id').eq('user_id', user.id).eq('status', 'complete'),
      ])

      setProfile(profileRes.data)
      setCourses(coursesRes.data || [])
      setPurchasedIds(new Set((purchasesRes.data || []).map((p: { course_id: string }) => p.course_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleBuy(course: Course) {
    setBuying(course.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          user_id: user.id,
          amount: course.price,
          currency: course.currency,
          course_title: course.title,
        }),
      })
      const data = await res.json()
      if (data.payment_url) {
        window.location.href = data.payment_url
      } else {
        toast.error('Erreur lors de l\'initialisation du paiement')
      }
    } catch {
      toast.error('Erreur réseau')
    }
    setBuying(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="gradient-card rounded-3xl p-8 text-white mb-8">
        <h1 className="text-2xl md:text-3xl font-black mb-2">
          Bienvenue {profile?.first_name} !!!
        </h1>
        <p className="text-blue-100 text-lg font-medium mb-1">
          RIVO, la plateforme qui transforme l&apos;apprentissage en opportunité.
        </p>
        <p className="text-blue-200 text-sm">
          Développez vos compétences grâce à un apprentissage moderne, simple et accessible.
          Apprenez à votre rythme et construisez un meilleur avenir grâce au savoir et à la technologie.
        </p>
      </div>

      {/* Formations title */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-dark">Formations disponibles</h2>
        <span className="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1 rounded-full">
          {courses.length} formation{courses.length > 1 ? 's' : ''}
        </span>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Aucune formation disponible pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const owned = purchasedIds.has(course.id)
            const isExpanded = expanded === course.id
            return (
              <div key={course.id} className="card group">
                <div className="relative h-44 bg-gradient-to-br from-primary-500 to-primary-700 overflow-hidden">
                  {course.cover_image_url ? (
                    <Image src={course.cover_image_url} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/40" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-accent-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                    {formatCurrency(course.price, course.currency)}
                  </div>
                  {owned && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      ✓ Acheté
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-dark text-lg mb-2">{course.title}</h3>
                  <p className="text-gray-500 text-sm mb-2 line-clamp-2">{course.description}</p>

                  {isExpanded && (
                    <p className="text-gray-600 text-sm mb-3 mt-2 border-t pt-2 leading-relaxed">
                      {course.full_description || course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-accent-500 mb-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : course.id)}
                      className="flex-1 btn-outline py-2 px-3 text-sm justify-center"
                    >
                      {isExpanded ? 'Réduire' : 'Lire plus'}
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {!owned && (
                      <button
                        onClick={() => handleBuy(course)}
                        disabled={buying === course.id}
                        className="flex-1 btn-accent py-2 px-3 text-sm justify-center disabled:opacity-70"
                      >
                        {buying === course.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Acheter
                          </>
                        )}
                      </button>
                    )}
                    {owned && (
                      <button
                        onClick={() => router.push('/dashboard/formations')}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 text-sm rounded-xl font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        Accéder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
