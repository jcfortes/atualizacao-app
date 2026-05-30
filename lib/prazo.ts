/**
 * Helper de verificação de prazo de uso da plataforma.
 *
 * O admin define no /admin/contratantes da landing:
 * - prazo_tipo: 'dias' | 'meses' | 'anos' | 'indeterminado'
 * - prazo_quantidade: número
 * - prazo_inicio: data ISO
 *
 * Aqui calculamos se a data atual já passou da expiração.
 *
 * IMPORTANTE: esse arquivo deve ser idêntico em todos os apps da
 * plataforma pra garantir comportamento consistente.
 */

export interface PrazoInfo {
  prazo_tipo: string | null
  prazo_quantidade: number | null
  prazo_inicio: string | null
}

export interface ResultadoVerificacao {
  expirado: boolean
  indeterminado: boolean
  dataExpiracao: Date | null
  diasRestantes: number | null
}

/**
 * Calcula se um perfil tem o prazo expirado.
 *
 * @returns objeto com flags e detalhes
 */
export function verificarPrazo(info: PrazoInfo): ResultadoVerificacao {
  // Sem dados ou indeterminado → nunca expira
  if (
    !info.prazo_tipo ||
    info.prazo_tipo === 'indeterminado' ||
    !info.prazo_quantidade ||
    !info.prazo_inicio
  ) {
    return {
      expirado: false,
      indeterminado: true,
      dataExpiracao: null,
      diasRestantes: null,
    }
  }

  const inicio = new Date(info.prazo_inicio)
  const expira = new Date(inicio)

  switch (info.prazo_tipo) {
    case 'dias':
      expira.setDate(expira.getDate() + info.prazo_quantidade)
      break
    case 'meses':
      expira.setMonth(expira.getMonth() + info.prazo_quantidade)
      break
    case 'anos':
      expira.setFullYear(expira.getFullYear() + info.prazo_quantidade)
      break
    default:
      return {
        expirado: false,
        indeterminado: true,
        dataExpiracao: null,
        diasRestantes: null,
      }
  }

  const agora = new Date()
  const msPorDia = 1000 * 60 * 60 * 24
  const diasRestantes = Math.ceil((expira.getTime() - agora.getTime()) / msPorDia)

  return {
    expirado: agora.getTime() > expira.getTime(),
    indeterminado: false,
    dataExpiracao: expira,
    diasRestantes,
  }
}
