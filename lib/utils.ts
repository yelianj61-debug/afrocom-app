import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BadgeLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'XOF') {
  if (currency === 'XOF') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA'
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function getBadgeColor(level: BadgeLevel): string {
  const colors: Record<BadgeLevel, string> = {
    debutant: 'text-gray-500 bg-gray-100',
    bronze: 'text-amber-700 bg-amber-100',
    argent: 'text-slate-500 bg-slate-100',
    or: 'text-yellow-600 bg-yellow-100',
    diamant: 'text-blue-600 bg-blue-100',
    admin: 'text-purple-600 bg-purple-100',
  }
  return colors[level] || colors.debutant
}

export function getBadgeLabel(level: BadgeLevel): string {
  const labels: Record<BadgeLevel, string> = {
    debutant: 'Débutant',
    bronze: 'Bronze',
    argent: 'Argent',
    or: 'Or',
    diamant: 'Diamant',
    admin: 'Admin',
  }
  return labels[level] || 'Débutant'
}

export function getBadgeIcon(level: BadgeLevel): string {
  const icons: Record<BadgeLevel, string> = {
    debutant: '🌱',
    bronze: '🥉',
    argent: '🥈',
    or: '🥇',
    diamant: '💎',
    admin: '👑',
  }
  return icons[level] || '🌱'
}
