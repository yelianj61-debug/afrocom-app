export type BadgeLevel = 'debutant' | 'bronze' | 'argent' | 'or' | 'diamant' | 'admin'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  birth_date?: string
  avatar_url?: string
  referral_code?: string
  referred_by?: string
  balance: number
  currency: string
  badge_level: BadgeLevel
  created_at: string
  updated_at: string
  email?: string
}

export interface Course {
  id: string
  title: string
  description?: string
  full_description?: string
  cover_image_url?: string
  price: number
  currency: string
  file_url?: string
  is_published: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  course_id: string
  amount: number
  currency: string
  status: 'en_attente' | 'complete' | 'echoue'
  payment_method?: string
  transaction_id?: string
  purchased_at: string
  courses?: Course
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  certificate_url?: string
  message?: string
  issued_at: string
  courses?: Course
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  currency: string
  method: 'mobile_money' | 'carte_bancaire' | 'autre'
  status: 'en_attente' | 'en_cours' | 'complete' | 'rejete'
  processed_at?: string
  created_at: string
  profiles?: Profile
}

export interface ReferralEarning {
  id: string
  referrer_id: string
  referred_id: string
  purchase_id: string
  amount: number
  currency: string
  created_at: string
}

export interface AdminDashboard {
  total_utilisateurs: number
  total_achats: number
  revenu_total: number
}
