'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { type TipoIndice } from '@/lib/indices'

interface Dado {
  data: string
  valor: string
}

type Periodo = '12m' | '5a' | '10a' | 'tudo'

const PERIODOS: { key: Periodo; label: string; meses: number | null }[] = [
  { key: '12m', label: '12 meses', meses: 12 },
  { key: '5a', label: '5 anos', meses: 60 },
  { key: '10a', label: '10 anos', meses: 120 },
  { key: 'tudo', label: 'Tudo', meses: null },
]

function formatarTooltipValor(v: number, tipo: TipoIndice): string {
  if (tipo === 'valor_absoluto') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }
  return `${v.toFixed(4).replace('.', ',')}%`
}

// Reduz uma série grande pra ~200 pontos pra não travar o gráfico
function reduzirSerie<T>(pontos: T[], limite = 200): T[] {
  if (pontos.length <= limite) return pontos
  const step = Math.ceil(pontos.length / limite)
  return pontos.filter((_, i) => i % step === 0)
}

export function Grafico({ dados, tipo }: { dados: Dado[]; tipo: TipoIndice }) {
  const [periodo, setPeriodo] = useState<Periodo>('12m')

  // dados vem do mais recente pro mais antigo — pro gráfico inverte (cronológico)
  const pontosFiltrados = useMemo(() => {
    const meses = PERIODOS.find((p) => p.key === periodo)?.meses
    const subset = meses ? dados.slice(0, meses) : dados
    const cronologico = [...subset].reverse()
    const reduzido = reduzirSerie(cronologico)
    return reduzido.map((d) => ({
      data: d.data,
      valor: parseFloat(d.valor.replace(',', '.')),
    }))
  }, [dados, periodo])

  // Pra taxas mensais (sempre variando perto de 0%), usa linha. Pra valor absoluto, usa área preenchida
  const isAbsoluto = tipo === 'valor_absoluto'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
      {/* Filtros de período */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-900">Evolução histórica</h3>
        <div className="flex gap-1.5 flex-wrap">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                periodo === p.key
                  ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700'
                  : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          {isAbsoluto ? (
            <AreaChart data={pontosFiltrados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#fff', fontSize: 11, marginBottom: 4, fontWeight: 600 }}
                itemStyle={{ color: '#fff', fontSize: 12 }}
                formatter={(v) => [formatarTooltipValor(Number(v), tipo), 'Valor'] as [string, string]}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValor)"
                animationDuration={500}
              />
            </AreaChart>
          ) : (
            <LineChart data={pontosFiltrados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v) => `${v.toFixed(2).replace('.', ',')}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#fff', fontSize: 11, marginBottom: 4, fontWeight: 600 }}
                itemStyle={{ color: '#fff', fontSize: 12 }}
                formatter={(v) => [formatarTooltipValor(Number(v), tipo), 'Taxa'] as [string, string]}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                animationDuration={500}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {pontosFiltrados.length > 0 && (
        <p className="text-[11px] text-gray-400 text-center mt-3">
          {pontosFiltrados.length.toLocaleString('pt-BR')} pontos · {pontosFiltrados[0].data} → {pontosFiltrados[pontosFiltrados.length - 1].data}
        </p>
      )}
    </div>
  )
}
