import { redirect } from 'next/navigation'

export default function OnboardingPage() {
  // El onboarding público ha sido deshabilitado.
  redirect('/dashboard')
}
