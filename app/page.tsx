'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Award, Users, Star, ChevronRight, Check, TrendingUp, Shield, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function LandingPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourses() {
      const supabase = createClient()
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .limit(6)
      setCourses(data || [])
      setLoading(false)
    }
    fetchCourses()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 gradient-card rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-dark">RIVO</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#formations" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Formations</a>
              <a href="#avantages" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Avantages</a>
              <a href="#parrainage" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Parrainage</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                Connexion
              </Link>
              <Link href="/auth/register" className="btn-accent py-2 px-5 text-sm">
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-accent-500" />
            La plateforme #1 de formation en ligne
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Transformez votre avenir<br />
            <span className="text-accent-500">grâce au savoir</span>
          </h1>
          <p className="text-xl text-blue-100 mb-4 max-w-2xl mx-auto">
            Plus de <span className="font-bold text-white">200 formations disponibles</span>.
            Apprenez à votre rythme et obtenez une attestation reconnue.
          </p>
          <p className="text-blue-200 italic mb-10 text-lg">
            &ldquo;RIVO, la plateforme qui transforme l&apos;apprentissage en opportunité.&rdquo;
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="btn-accent text-lg px-8 py-4">
              Commencer gratuitement
              <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="#formations" className="bg-white/20 hover:bg-white/30 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 inline-flex items-center gap-2 backdrop-blur-sm">
              Voir les formations
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
            {[
              { value: '200+', label: 'Formations' },
              { value: '5K+', label: 'Apprenants' },
              { value: '98%', label: 'Satisfaction' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="avantages" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title mb-4">Pourquoi choisir RIVO ?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Une plateforme pensée pour votre réussite, avec les meilleurs outils d&apos;apprentissage.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <BookOpen className="w-7 h-7" />,
                title: 'Formations de qualité',
                desc: 'Des contenus soigneusement sélectionnés et mis à jour régulièrement par des experts.',
                color: 'bg-blue-100 text-primary-600',
              },
              {
                icon: <Award className="w-7 h-7" />,
                title: 'Attestation reconnue',
                desc: 'Obtenez une attestation officielle après chaque formation validée.',
                color: 'bg-amber-100 text-accent-500',
              },
              {
                icon: <Users className="w-7 h-7" />,
                title: 'Système de parrainage',
                desc: 'Gagnez 1 000 FCFA pour chaque ami parrainé qui achète une formation.',
                color: 'bg-green-100 text-green-600',
              },
              {
                icon: <TrendingUp className="w-7 h-7" />,
                title: 'Progression par badges',
                desc: 'Évoluez de Débutant jusqu\'au rang Diamant en achetant plus de formations.',
                color: 'bg-purple-100 text-purple-600',
              },
              {
                icon: <Zap className="w-7 h-7" />,
                title: 'Accès immédiat',
                desc: 'Après paiement, téléchargez et consultez vos formations immédiatement.',
                color: 'bg-yellow-100 text-yellow-600',
              },
              {
                icon: <Shield className="w-7 h-7" />,
                title: 'Paiement sécurisé',
                desc: 'Paiements via Mobile Money, carte bancaire. Retraits en moins de 30 min.',
                color: 'bg-red-100 text-red-500',
              },
            ].map((feat) => (
              <div key={feat.title} className="card p-6">
                <div className={`w-14 h-14 ${feat.color} rounded-2xl flex items-center justify-center mb-4`}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-dark mb-2">{feat.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="formations" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="section-title mb-4">Nos formations populaires</h2>
            <p className="text-gray-500 text-lg">Découvrez nos meilleures formations et commencez à apprendre dès aujourd&apos;hui.</p>
          </div>
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-6 bg-gray-200 rounded w-24" />
                      <div className="h-10 bg-gray-200 rounded-xl w-28" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Link href="/auth/register" className="btn-primary">
              Voir toutes les formations
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Referral */}
      <section id="parrainage" className="py-20 px-4 bg-primary-50">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Users className="w-4 h-4" />
            Programme de parrainage
          </div>
          <h2 className="section-title mb-6">Gagnez de l&apos;argent en parrainant</h2>
          <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
            Partagez votre code de parrainage avec vos amis.
            Pour chaque ami qui achète une formation, vous recevez <strong className="text-primary-600">1 000 FCFA</strong> directement sur votre solde RIVO.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { step: '1', title: 'Inscrivez-vous', desc: 'Créez votre compte et récupérez votre code unique de parrainage.' },
              { step: '2', title: 'Partagez', desc: 'Envoyez votre code à vos amis, famille, collègues.' },
              { step: '3', title: 'Gagnez', desc: '1 000 FCFA crédités à chaque achat de votre filleul.' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 shadow-md text-left">
                <div className="w-10 h-10 gradient-card rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-dark text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-primary-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-3">Niveaux de badges RIVO</h3>
            <p className="text-blue-100 mb-6">Plus vous achetez, plus vous montez en grade !</p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { icon: '🌱', name: 'Débutant', req: '0 formation' },
                { icon: '🥉', name: 'Bronze', req: '5+ formations' },
                { icon: '🥈', name: 'Argent', req: '10+ formations' },
                { icon: '🥇', name: 'Or', req: '20+ formations' },
                { icon: '💎', name: 'Diamant', req: '50+ formations' },
              ].map((badge) => (
                <div key={badge.name} className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[100px]">
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <div className="font-semibold">{badge.name}</div>
                  <div className="text-xs text-blue-200">{badge.req}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Prêt à transformer votre avenir ?
          </h2>
          <p className="text-blue-100 text-xl mb-10">
            Rejoignez des milliers d&apos;apprenants sur RIVO dès aujourd&apos;hui.
          </p>
          <Link href="/auth/register" className="btn-accent text-lg px-10 py-4">
            Créer mon compte gratuitement
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 gradient-card rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">RIVO</div>
                <div className="text-xs">Plateforme de formation en ligne</div>
              </div>
            </div>
            <p className="text-sm text-center">
              &copy; {new Date().getFullYear()} RIVO par Martial Gbesso. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/auth/login" className="hover:text-white transition-colors">Connexion</Link>
              <Link href="/auth/register" className="hover:text-white transition-colors">Inscription</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="card group">
      <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-700 overflow-hidden">
        {course.cover_image_url ? (
          <Image
            src={course.cover_image_url}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white/50" />
          </div>
        )}
        <div className="absolute top-3 right-3 bg-accent-500 text-white text-sm font-bold px-3 py-1 rounded-full">
          {formatCurrency(course.price, course.currency)}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-dark text-lg mb-2 line-clamp-2">{course.title}</h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-3">{course.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-accent-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
          <Link
            href="/auth/register"
            className="btn-primary py-2 px-4 text-sm"
          >
            Acheter
          </Link>
        </div>
      </div>
    </div>
  )
}
