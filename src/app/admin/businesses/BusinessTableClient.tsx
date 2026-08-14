'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, ExternalLink } from 'lucide-react'
import { BusinessActions } from './BusinessActions'
import { Card, CardContent } from '@/components/ui/card'

type BusinessRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_active: boolean
  ownerProfile?: { full_name: string | null; phone: string | null }
  courtCount: number
  todayReservationsCount: number
}

export function BusinessTableClient({ businesses }: { businesses: BusinessRow[] }) {
  const [search, setSearch] = useState('')

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.ownerProfile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar negocio, dueño o portal público..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-slate-950 shadow-sm"
        />
      </div>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Logo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nombre / Portal público</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Canchas</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Reservas hoy</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Dueño / Contacto</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                      No se encontraron negocios con esos criterios.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((b) => (
                      <tr key={b.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {b.logo_url ? (
                            <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/5 group-hover:scale-110 transition-transform" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-white/5">
                              {b.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 transition-colors group-hover:text-emerald-700">{b.name}</div>
                        <div className="font-mono text-xs text-slate-400">/{b.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700">
                          {b.courtCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className={`h-7 rounded-lg border-slate-200 px-3 ${b.todayReservationsCount > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                          {b.todayReservationsCount}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-800">{b.ownerProfile?.full_name || 'Sin dueño'}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">{b.ownerProfile?.phone || '-'}</span>
                              {b.ownerProfile?.phone && (
                                <a 
                                  href={`https://wa.me/${b.ownerProfile.phone.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-green-500/20 rounded-md text-green-500 transition-colors"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageSquare className="h-3 w-3 fill-current" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={b.is_active ? "default" : "destructive"}
                          className={`rounded-full px-4 py-0.5 text-[10px] font-black uppercase tracking-widest ${b.is_active ? 'bg-emerald-700 text-white shadow-sm' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}
                        >
                          {b.is_active ? "ACTIVO" : "BLOQUEADO"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/${b.slug}`} 
                            target="_blank" 
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900"
                            title="Ver Página Pública"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <BusinessActions business={b} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
