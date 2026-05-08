'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, ExternalLink } from 'lucide-react'
import { BusinessActions } from './BusinessActions'
import { Card, CardContent } from '@/components/ui/card'

export function BusinessTableClient({ businesses }: { businesses: any[] }) {
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
          placeholder="Buscar negocio, dueño o slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-900/50 border-white/5 h-10 rounded-xl"
        />
      </div>

      <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-center">Logo</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Nombre / Slug</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-center">Canchas</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-center">Reservas Hoy</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Dueño / Contacto</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Estado</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                      No se encontraron negocios con esos criterios.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((b) => (
                    <tr key={b.id} className="group hover:bg-white/[0.02] transition-colors">
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
                        <div className="font-bold text-white group-hover:text-primary transition-colors">{b.name}</div>
                        <div className="text-xs text-muted-foreground font-mono opacity-60">/{b.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-800 text-zinc-300 font-bold border border-white/5">
                          {b.courtCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className={`rounded-lg h-7 px-3 border-white/5 ${b.todayReservationsCount > 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-zinc-800 text-zinc-500'}`}>
                          {b.todayReservationsCount}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-white text-xs">{b.ownerProfile?.full_name || 'Sin dueño'}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{b.ownerProfile?.phone || '-'}</span>
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
                          className={`rounded-full px-4 py-0.5 text-[10px] uppercase font-black tracking-widest ${b.is_active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}
                        >
                          {b.is_active ? "ACTIVO" : "BLOQUEADO"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/${b.slug}`} 
                            target="_blank" 
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-white/5 bg-zinc-900 text-muted-foreground hover:text-white hover:bg-zinc-800 transition-all shadow-sm"
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
