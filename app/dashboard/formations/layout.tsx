'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

function PaymentToast() {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Paiement réussi ! Votre formation est disponible.')
      window.history.replaceState({}, '', '/dashboard/formations')
    }
  }, [searchParams])
  return null
}

export default function FormationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PaymentToast />
      </Suspense>
      {children}
    </>
  )
}
