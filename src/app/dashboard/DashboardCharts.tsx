"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const dataWeekly = [
  { name: 'Lun', reservas: 4 },
  { name: 'Mar', reservas: 6 },
  { name: 'Mie', reservas: 8 },
  { name: 'Jue', reservas: 12 },
  { name: 'Vie', reservas: 18 },
  { name: 'Sab', reservas: 24 },
  { name: 'Dom', reservas: 20 },
]

const dataRevenue = [
  { name: 'Ene', ingresos: 400000 },
  { name: 'Feb', ingresos: 300000 },
  { name: 'Mar', ingresos: 500000 },
  { name: 'Abr', ingresos: 450000 },
  { name: 'May', ingresos: 600000 },
  { name: 'Jun', ingresos: 700000 },
]

export function DashboardCharts() {
  return (
    <div className="grid gap-6 md:grid-cols-2 mt-8">
      <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0"></div>
        <CardHeader className="pb-8">
          <CardTitle className="text-xl font-bold tracking-tight text-white">Reservas por Día</CardTitle>
          <CardDescription className="text-zinc-400">Distribución de la semana actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataWeekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                <defs>
                  <linearGradient id="colorReservas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}} 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} 
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Bar dataKey="reservas" fill="url(#colorReservas)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0"></div>
        <CardHeader className="pb-8">
          <CardTitle className="text-xl font-bold tracking-tight text-white">Ingresos Estimados</CardTitle>
          <CardDescription className="text-zinc-400">Proyección mensual en Colones (₡)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₡${value/1000}k`} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  formatter={(value: any) => [`₡${Number(value).toLocaleString()}`, 'Ingresos']}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
