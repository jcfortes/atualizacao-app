import ExcelJS from 'exceljs'
import { INDICE_LABEL, type Indice } from './indices'

interface Resultado {
  valor_original: number
  valor_corrigido: number
  fator: number
  variacao_pct: number
  periodos: number
  dados: { data: string; valor: string }[]
}

function moedaStr(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pctStr(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(4).replace('.', ',')}%`
}

// ── Cores ────────────────────────────────────────────────────────────────────
const COR = {
  cabecalho:    '111827', // cinza escuro (fundo header)
  cabecalhoTxt: 'FFFFFF',
  linhaZero:    'EFF6FF', // azul claro
  linhaZeroTxt: '1E40AF',
  linhaAlt:     'F9FAFB', // cinza claríssimo
  verde:        '059669',
  vermelho:     'DC2626',
  rodape:       '1F2937',
  rodapeTxt:    'FFFFFF',
  totalTxt:     '34D399', // emerald claro
  resumoBg:     'D1FAE5', // verde claro
  resumoBorda:  '6EE7B7',
  kpiBg:        'F3F4F6',
}

export async function gerarExcelAtualizacao(
  resultado: Resultado,
  indice: Indice,
  inicio: string,
  fim: string
): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Matemático.com.br'
  wb.created = new Date()

  // ── Aba 1: Planilha de Atualização ──────────────────────────────────────────
  const ws = wb.addWorksheet('Planilha de Atualização', {
    views: [{ state: 'frozen', ySplit: 7 }],
  })

  ws.getColumn('A').width = 22
  ws.getColumn('B').width = 16
  ws.getColumn('C').width = 18
  ws.getColumn('D').width = 20
  ws.getColumn('E').width = 22

  // Linha 1 — Título
  ws.mergeCells('A1:E1')
  const titulo = ws.getCell('A1')
  titulo.value = `Planilha de Atualização Monetária — ${indice}`
  titulo.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF' + COR.cabecalho } }
  titulo.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(1).height = 28

  // Linha 2 — Subtítulo
  ws.mergeCells('A2:E2')
  const sub = ws.getCell('A2')

  function mesLabel(ym: string) {
    const [a, m] = ym.split('-')
    return `${m}/${a}`
  }

  sub.value = `${INDICE_LABEL[indice]}  ·  Período: ${mesLabel(inicio)} a ${mesLabel(fim)}  ·  ${resultado.periodos} meses`
  sub.font = { name: 'Arial', size: 9, color: { argb: 'FF6B7280' } }
  sub.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(2).height = 18

  // Linha 3 — Emissão
  ws.mergeCells('A3:E3')
  const emissao = ws.getCell('A3')
  emissao.value = `Emitido em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}  ·  matemático.com.br`
  emissao.font = { name: 'Arial', size: 8, color: { argb: 'FF9CA3AF' } }
  emissao.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(3).height = 16

  // Linha 4 — Separador (vazia)
  ws.getRow(4).height = 8

  // Linha 5 — KPIs (resumo)
  const kpis = [
    { label: 'Valor Original', valor: moedaStr(resultado.valor_original) },
    { label: 'Valor Corrigido', valor: moedaStr(resultado.valor_corrigido) },
    { label: 'Diferença', valor: moedaStr(resultado.valor_corrigido - resultado.valor_original) },
    { label: 'Variação', valor: pctStr(resultado.variacao_pct) },
    { label: 'Fator de Correção', valor: resultado.fator.toFixed(6).replace('.', ',') },
  ]

  const colsKpi = ['A', 'B', 'C', 'D', 'E']
  kpis.forEach((kpi, i) => {
    const col = colsKpi[i]
    const labelCell = ws.getCell(`${col}5`)
    labelCell.value = kpi.label
    labelCell.font = { name: 'Arial', size: 7, bold: true, color: { argb: 'FF6B7280' } }
    labelCell.alignment = { horizontal: 'center' }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.kpiBg } }

    const valCell = ws.getCell(`${col}6`)
    valCell.value = kpi.valor
    valCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + COR.cabecalho } }
    valCell.alignment = { horizontal: 'center', vertical: 'middle' }
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.resumoBg } }

    // Borda
    for (const row of [5, 6]) {
      const c = ws.getCell(`${col}${row}`)
      c.border = {
        top:    { style: 'thin', color: { argb: 'FF' + COR.resumoBorda } },
        bottom: { style: 'thin', color: { argb: 'FF' + COR.resumoBorda } },
        left:   { style: 'thin', color: { argb: 'FF' + COR.resumoBorda } },
        right:  { style: 'thin', color: { argb: 'FF' + COR.resumoBorda } },
      }
    }
  })

  ws.getRow(5).height = 16
  ws.getRow(6).height = 22

  // Linha 7 — Cabeçalho da tabela
  const headerRow = ws.getRow(7)
  const headers = ['Mês', 'Taxa (%)', 'Fator Mensal', 'Fator Acumulado', 'Valor Corrigido (R$)']
  const aligns: ('left' | 'right')[] = ['left', 'right', 'right', 'right', 'right']

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + COR.cabecalhoTxt } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.cabecalho } }
    cell.alignment = { horizontal: aligns[i], vertical: 'middle' }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF374151' } },
    }
  })
  headerRow.height = 22

  // Linha 8 — Linha zero (valor original)
  const row0 = ws.getRow(8)
  const cells0 = [
    { v: 'Valor original (base)', al: 'left' as const, bold: true, color: COR.linhaZeroTxt },
    { v: '—',                     al: 'center' as const, bold: false, color: '9CA3AF' },
    { v: '1,000000',              al: 'right' as const,  bold: false, color: '9CA3AF' },
    { v: '1,000000',              al: 'right' as const,  bold: false, color: '9CA3AF' },
    { v: moedaStr(resultado.valor_original), al: 'right' as const, bold: true, color: COR.linhaZeroTxt },
  ]
  cells0.forEach(({ v, al, bold, color }, i) => {
    const cell = row0.getCell(i + 1)
    cell.value = v
    cell.font = { name: 'Arial', size: 9, bold, color: { argb: 'FF' + color } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.linhaZero } }
    cell.alignment = { horizontal: al, vertical: 'middle' }
  })
  row0.height = 18

  // Linhas de dados
  let fatorAcum = 1
  resultado.dados.forEach((d, i) => {
    const taxa = parseFloat(d.valor.replace(',', '.'))
    const fatorMensal = 1 + taxa / 100
    fatorAcum = fatorAcum * fatorMensal
    const valorCorrigido = resultado.valor_original * fatorAcum
    const isPos = taxa >= 0
    const isAlt = i % 2 === 0

    const dataRow = ws.getRow(9 + i)
    dataRow.height = 17

    // Mês
    const cMes = dataRow.getCell(1)
    cMes.value = d.data
    cMes.font = { name: 'Arial', size: 9, color: { argb: 'FF374151' } }
    cMes.alignment = { horizontal: 'left', vertical: 'middle' }

    // Taxa
    const cTaxa = dataRow.getCell(2)
    cTaxa.value = `${taxa.toFixed(4).replace('.', ',')}%`
    cTaxa.font = { name: 'Courier New', size: 9, bold: true, color: { argb: 'FF' + (isPos ? COR.verde : COR.vermelho) } }
    cTaxa.alignment = { horizontal: 'right', vertical: 'middle' }

    // Fator Mensal
    const cFatM = dataRow.getCell(3)
    cFatM.value = fatorMensal.toFixed(6).replace('.', ',')
    cFatM.font = { name: 'Courier New', size: 9, color: { argb: 'FF6B7280' } }
    cFatM.alignment = { horizontal: 'right', vertical: 'middle' }

    // Fator Acumulado
    const cFatA = dataRow.getCell(4)
    cFatA.value = fatorAcum.toFixed(6).replace('.', ',')
    cFatA.font = { name: 'Courier New', size: 9, bold: true, color: { argb: 'FF' + COR.cabecalho } }
    cFatA.alignment = { horizontal: 'right', vertical: 'middle' }

    // Valor Corrigido
    const cValor = dataRow.getCell(5)
    cValor.value = moedaStr(valorCorrigido)
    cValor.font = { name: 'Courier New', size: 9, bold: true, color: { argb: 'FF' + COR.verde } }
    cValor.alignment = { horizontal: 'right', vertical: 'middle' }

    // Fundo alternado
    if (isAlt) {
      for (let col = 1; col <= 5; col++) {
        dataRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.linhaAlt } }
      }
    }
  })

  // Linha de totais
  const totalRowNum = 9 + resultado.dados.length
  const totalRow = ws.getRow(totalRowNum)
  totalRow.height = 22

  const totais = [
    `${resultado.periodos} meses`,
    pctStr(resultado.variacao_pct),
    '—',
    resultado.fator.toFixed(6).replace('.', ','),
    moedaStr(resultado.valor_corrigido),
  ]
  const totalAligns: ('left' | 'right' | 'center')[] = ['left', 'right', 'center', 'right', 'right']
  totais.forEach((v, i) => {
    const cell = totalRow.getCell(i + 1)
    cell.value = v
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + (i === 4 ? COR.totalTxt : COR.cabecalhoTxt) } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.rodape } }
    cell.alignment = { horizontal: totalAligns[i], vertical: 'middle' }
    cell.border = { top: { style: 'medium', color: { argb: 'FF4B5563' } } }
  })

  // Nota de rodapé
  const notaRowNum = totalRowNum + 2
  ws.mergeCells(`A${notaRowNum}:E${notaRowNum}`)
  const nota = ws.getCell(`A${notaRowNum}`)
  nota.value = 'Fonte: Banco Central do Brasil (api.bcb.gov.br) · Dados oficiais IBGE/FGV/BCB · matemático.com.br'
  nota.font = { name: 'Arial', size: 7, italic: true, color: { argb: 'FF9CA3AF' } }
  nota.alignment = { horizontal: 'left' }

  // ── Aba 2: Resumo ──────────────────────────────────────────────────────────
  const wsR = wb.addWorksheet('Resumo')
  wsR.getColumn('A').width = 28
  wsR.getColumn('B').width = 28

  const resumoItens = [
    ['Índice', indice],
    ['Descrição', INDICE_LABEL[indice]],
    ['Período início', mesLabel(inicio)],
    ['Período fim', mesLabel(fim)],
    ['Quantidade de meses', resultado.periodos],
    ['', ''],
    ['Valor original', moedaStr(resultado.valor_original)],
    ['Valor corrigido', moedaStr(resultado.valor_corrigido)],
    ['Diferença', moedaStr(resultado.valor_corrigido - resultado.valor_original)],
    ['Variação acumulada', pctStr(resultado.variacao_pct)],
    ['Fator de correção', resultado.fator.toFixed(6).replace('.', ',')],
    ['', ''],
    ['Data de emissão', new Date().toLocaleDateString('pt-BR')],
    ['Fonte', 'Banco Central do Brasil'],
  ]

  wsR.mergeCells('A1:B1')
  const rTitulo = wsR.getCell('A1')
  rTitulo.value = `Resumo — Atualização ${indice}`
  rTitulo.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF' + COR.cabecalho } }
  rTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.resumoBg } }
  rTitulo.alignment = { horizontal: 'center', vertical: 'middle' }
  wsR.getRow(1).height = 28

  resumoItens.forEach((item, i) => {
    const row = wsR.getRow(i + 2)
    row.height = 18
    const [label, valor] = item
    if (!label && !valor) return
    const cL = row.getCell(1)
    cL.value = label
    cL.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } }
    cL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.kpiBg } }
    cL.alignment = { horizontal: 'left', vertical: 'middle' }

    const cV = row.getCell(2)
    cV.value = typeof valor === 'number' ? valor : String(valor)
    cV.font = { name: 'Arial', size: 9, bold: false, color: { argb: 'FF' + COR.cabecalho } }
    cV.alignment = { horizontal: 'left', vertical: 'middle' }
  })

  // Gera o buffer e retorna como Blob
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
