'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, LayoutDashboard, GraduationCap, Award, User, LogOut, Menu, X, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { getBadgeColor, getBadgeIcon, getBadgeLabel } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Bord', icon: LayoutDashboard },
  { href: '/dashboard/formations', label: 'Mes formations', icon: GraduationCap },
  { href: '/dashboard/attestations', label: 'Attestation', icon: Award },
  { href: '/dashboard/profil', label: 'Profil', icon: User },
  { href: '/dashboard/retrait', label: 'Retrait', icon: Wallet },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [router])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none lg:border-r border-gray-100 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 gradient-card rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-dark">RIVO</span>
            </Link>
          </div>

          {/* Profile summary */}
          {profile && (
            <div className="p-4 mx-3 mt-4 bg-primary-50 rounded-2xl">
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 gradient-card rounded-full flex items-center justify-center text-white font-bold">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-dark text-sm truncate">{profile.first_name} {profile.last_name}</div>
                  <span className={`badge text-xs ${getBadgeColor(profile.badge_level)}`}>
                    {getBadgeIcon(profile.badge_level)} {getBadgeLabel(profile.badge_level)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 w-full font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-card rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-dark text-lg">RIVO</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
