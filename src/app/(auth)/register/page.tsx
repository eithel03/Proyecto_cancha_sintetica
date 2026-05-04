import { redirect } from 'next/navigation'

export default function RegisterPage() {
  // El registro público ha sido deshabilitado.
  // Solo los administradores pueden crear negocios.
  redirect('/login')
}
