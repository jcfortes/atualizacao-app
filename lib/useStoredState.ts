'use client'

import { useEffect, useState } from 'react'

// Expiração de 7 dias em milissegundos
const TTL_MS = 7 * 24 * 60 * 60 * 1000

interface Wrapper<T> {
  v: T          // valor
  t: number     // timestamp (ms) — quando foi salvo
}

/**
 * useState que persiste o valor em localStorage com expiração de 7 dias.
 * Inicia com `initial` (SSR-safe) e hidrata do localStorage apenas no client.
 *
 * Útil pra manter parâmetros (valor, inicio, fim, índice) entre páginas e sessões,
 * permitindo o usuário ir da Calculadora pro Comparativo sem redigitar.
 * Após 7 dias sem uso, o valor expira e volta ao padrão.
 */
export function useStoredState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)

  // Hidrata do localStorage no client (sem mismatch SSR)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        const parsed = JSON.parse(stored) as Wrapper<T>
        // Backward compat: se for valor cru (sem wrapper), aceita
        if (parsed && typeof parsed === 'object' && 't' in parsed && 'v' in parsed) {
          const idade = Date.now() - parsed.t
          if (idade < TTL_MS) {
            setValue(parsed.v)
          } else {
            // Expirado — remove
            localStorage.removeItem(key)
          }
        }
      }
    } catch {
      // Ignora se inválido
    }
    setHydrated(true)
  }, [key])

  // Persiste a cada mudança (com timestamp)
  useEffect(() => {
    if (!hydrated) return
    try {
      const wrapper: Wrapper<T> = { v: value, t: Date.now() }
      localStorage.setItem(key, JSON.stringify(wrapper))
    } catch {
      // localStorage cheio ou bloqueado
    }
  }, [key, value, hydrated])

  return [value, setValue]
}

// Chaves padronizadas (compartilhadas entre Calculadora e Comparativo)
export const STORAGE_KEYS = {
  valor: 'calc:valor',
  inicio: 'calc:inicio',
  fim: 'calc:fim',
  indiceCalc: 'calc:selecao',
  cestaCalc: 'calc:cestaId',
  indicesComp: 'comp:indices',
  // Encargos (opcionais)
  jurosMora: 'calc:jurosMora',       // string — % a.m. (ex: "1,00")
  multa: 'calc:multa',                 // string — % (ex: "2,00")
  despesas: 'calc:despesas',           // string — valor numérico (R$ ou %)
  despesasTipo: 'calc:despesasTipo',   // 'reais' | 'percentual'
} as const

// Limpa todos os parâmetros persistidos (chamado em Limpar manual e em Logout)
export function limparParametrosArmazenados() {
  if (typeof window === 'undefined') return
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignora
  }
}
