import { Suspense } from 'react'
import RegisterClient from './RegisterClient'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={<div>Cargando...</div>}>
        <RegisterClient />
      </Suspense>
    </div>
  )
}
