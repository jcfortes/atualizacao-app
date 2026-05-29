'use client'

import { useState } from 'react'
import { type Indice } from '@/lib/indices'
import { INDICE_INFO } from '@/lib/indiceInfo'
import { Info, Calendar, Building2, BookOpen, CheckCircle2, AlertCircle, Scale, ExternalLink, ChevronDown } from 'lucide-react'

export function SobreIndice({ indice }: { indice: Indice }) {
  const [aberto, setAberto] = useState(false)
  const info = INDICE_INFO[indice]
  if (!info) return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header / Toggle */}
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-700 rounded-lg p-2">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Sobre este indexador</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {aberto ? 'Clique para recolher' : 'Quem calcula, como funciona, onde é usado'}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {/* Conteúdo expansível */}
      {aberto && (
        <div className="px-5 pb-6 pt-1 border-t border-gray-100 space-y-5">
          {/* Nome completo + resumo */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-1">
              {info.nomeCompleto}
            </p>
            <p className="text-sm text-emerald-900 leading-relaxed">{info.resumo}</p>
          </div>

          {/* Grid de facts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FactCard
              icon={<Building2 className="w-4 h-4" />}
              label="Quem calcula"
              valor={info.quemCalcula}
            />
            <FactCard
              icon={<Calendar className="w-4 h-4" />}
              label="Desde"
              valor={info.desdeQuando}
            />
            <FactCard
              icon={<BookOpen className="w-4 h-4" />}
              label="Periodicidade"
              valor={info.periodicidade}
            />
          </div>

          {/* Metodologia */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Metodologia</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{info.metodologia}</p>
          </section>

          {/* Uso típico */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Uso típico</h3>
            <ul className="space-y-1.5">
              {info.usoTipico.map((u, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-emerald-600 mt-0.5">→</span>
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Vantagens + Limitações lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Vantagens
              </h3>
              <ul className="space-y-1">
                {info.vantagens.map((v, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Limitações
              </h3>
              <ul className="space-y-1">
                {info.limitacoes.map((l, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-2">
                    <span className="text-amber-600">!</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Base legal (se houver) */}
          {info.baseLegal && (
            <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
              <Scale className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Base legal</h3>
                <p className="text-xs text-gray-700 leading-relaxed">{info.baseLegal}</p>
              </div>
            </section>
          )}

          {/* Fontes */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fontes oficiais</h3>
            <div className="flex flex-wrap gap-2">
              {info.fontes.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-medium text-gray-600 rounded-full transition-all"
                >
                  {f.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function FactCard({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{valor}</p>
    </div>
  )
}
