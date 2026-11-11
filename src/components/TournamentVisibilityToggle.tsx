'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { updateTournamentVisibility } from '@/app/[slug]/admin/tournament/actions'

export function TournamentVisibilityToggle({
  businessId,
  initialShow,
}: {
  businessId: string
  initialShow: boolean
}) {
  const [show, setShow] = useState(initialShow)
  const [loading, setLoading] = useState(false)

  async function handleChange(checked: boolean) {
    const previous = show
    setShow(checked)
    setLoading(true)

    try {
      const result = await updateTournamentVisibility(businessId, checked)
      if (result?.error) {
        setShow(previous)
        toast.error(result.error)
        return
      }
      toast.success(checked ? 'Torneo visible en el portal' : 'Torneo oculto del portal')
    } catch {
      setShow(previous)
      toast.error('Error al actualizar la visibilidad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/70">
      <Switch
        checked={show}
        disabled={loading}
        onCheckedChange={handleChange}
        aria-label="Mostrar torneo en el portal público"
      />
      <span>{loading ? 'Guardando…' : show ? 'Visible en el portal' : 'Oculto en el portal'}</span>
    </label>
  )
}
