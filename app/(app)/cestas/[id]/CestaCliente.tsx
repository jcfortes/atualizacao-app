'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type Cesta } from '@/lib/cestas'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { HistoricoTabela } from '../../indices/[indice]/HistoricoTabela'

export function CestaCliente({ cesta }: { cesta: Cesta }) {
  const router = useRouter()
  const [carregada, setCarregada] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Aciona o pré-carregamento da série da cesta (cache)
    fetch(`/api/cestas/${cesta.id}/serie`)
      .then(() => setCarregada(true))
      .catch(() => setCarregada(true))
  }, [cesta.id])

  async function excluir() {
    setExcluindo(true)
    setErro('')
    try {
      const res = await fetch(`/api/cestas/${cesta.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const txt = await res.text()
        let msg = 'Erro ao excluir cesta.'
        try {
          const j = JSON.parse(txt)
          if (j?.error) msg = j.error
        } catch {}
        throw new Error(msg)
      }
      router.push('/cestas')
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir cesta.')
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Ações */}
      <div className="flex justify-end gap-2 flex-wrap">
        <Link
          href={`/cestas/${cesta.id}/editar`}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-sm"
        >
          <Pencil className="w-4 h-4" />
          Editar cesta
        </Link>
        <button
          type="button"
          onClick={() => { setConfirmandoExcluir(true); setErro('') }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Excluir cesta
        </button>
      </div>

      {/* Confirmação de exclusão (inline) */}
      {confirmandoExcluir && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-amber-900 mb-1">Excluir a cesta &ldquo;{cesta.nome}&rdquo;?</p>
              <p className="text-sm text-amber-800 mb-3">
                Esta ação não pode ser desfeita. A cesta e a configuração de seus índices serão removidas permanentemente.
              </p>
              {erro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{erro}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={excluir}
                  disabled={excluindo}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-sm"
                >
                  {excluindo ? 'Excluindo...' : 'Sim, excluir cesta'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmandoExcluir(false); setErro('') }}
                  disabled={excluindo}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reutiliza o HistoricoTabela mas com indice=cesta:id e endpoint customizado */}
      <HistoricoTabela
        indice={`cesta:${cesta.id}` as any}
        tipo="taxa_mensal"
        endpoint={`/api/cestas/${cesta.id}/serie`}
        labelCustom={cesta.nome}
      />

      {!carregada && null}
    </div>
  )
}
