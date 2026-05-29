import ExcelJS from 'exceljs'
import { INDICE_LABEL, type Indice, type TipoIndice } from './indices'

export interface DadoEnriquecido {
  data: string
  valor: string
  variacaoMes: number | null
  acumuladoAno: number | null
  acumulado12m: number | null
}

const COR = {
  cabecalho: '111827',
  cabecalhoTxt: 'FFFFFF',
  linhaAlt: 'F9FAFB',
  verde: '059669',
  vermelho: 'DC2626',
  cinza: '6B7280',
  resumoBg: 'D1FAE5',
  resumoBorda: '6EE7B7',
}

function numFromValor(valor: string): number {
  return parseFloat(valor.replace(',', '.'))
}

export async function gerarExcelHistorico(
  indice: Indice | string,
  tipo: TipoIndice,
  dados: DadoEnriquecido[],
  labelCustom?: string
): Promise<Blob> {
  const labelTitulo = labelCustom ?? INDICE_LABEL[indice as Indice] ?? String(indice)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Matemático.com.br'
  wb.created = new Date()

  const ws = wb.addWorksheet('Histórico', {
    views: [{ state: 'frozen', ySplit: 5 }],
  })

  const isAbsoluto = tipo === 'valor_absoluto'

  // ── Cabeçalho ───────────────────────────────────────────────────────────
  ws.mergeCells('A1:E1')
  const titulo = ws.getCell('A1')
  titulo.value = `Histórico Completo — ${labelTitulo}`
  titulo.font = { bold: true, size: 16, color: { argb: COR.cabecalho } }
  titulo.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 28

  ws.mergeCells('A2:E2')
  const subtitulo = ws.getCell('A2')
  subtitulo.value = `${dados.length.toLocaleString('pt-BR')} registros · ${dados[dados.length - 1]?.data ?? '—'} a ${dados[0]?.data ?? '—'} · Fonte: BCB / SGS`
  subtitulo.font = { size: 10, color: { argb: COR.cinza } }

  // Espaço
  ws.getRow(3).height = 8

  // ── Resumo do último registro ───────────────────────────────────────────
  const ultimo = dados[0]
  if (ultimo) {
    ws.mergeCells('A4:E4')
    const resumo = ws.getCell('A4')
    resumo.value = `Último registro (${ultimo.data}): ${
      isAbsoluto
        ? numFromValor(ultimo.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })
        : numFromValor(ultimo.valor).toFixed(4).replace('.', ',') + '%'
    }   ·   Acum. ano: ${ultimo.acumuladoAno !== null ? `${ultimo.acumuladoAno >= 0 ? '+' : ''}${ultimo.acumuladoAno.toFixed(2).replace('.', ',')}%` : '—'}   ·   Acum. 12 meses: ${ultimo.acumulado12m !== null ? `${ultimo.acumulado12m >= 0 ? '+' : ''}${ultimo.acumulado12m.toFixed(2).replace('.', ',')}%` : '—'}`
    resumo.font = { size: 11, bold: true, color: { argb: COR.cabecalho } }
    resumo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.resumoBg } }
    resumo.border = {
      top: { style: 'thin', color: { argb: COR.resumoBorda } },
      bottom: { style: 'thin', color: { argb: COR.resumoBorda } },
      left: { style: 'thin', color: { argb: COR.resumoBorda } },
      right: { style: 'thin', color: { argb: COR.resumoBorda } },
    }
    resumo.alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(4).height = 24
  }

  // ── Headers da tabela (linha 5) ─────────────────────────────────────────
  const headers = isAbsoluto
    ? ['Data', 'Cotação (R$)', 'Var. mês', 'Acum. ano', 'Acum. 12 meses']
    : ['Data', 'Taxa (% a.m.)', '', 'Acum. ano', 'Acum. 12 meses']

  ws.getRow(5).values = headers
  ws.getRow(5).eachCell((cell, col) => {
    if (col > headers.length) return
    cell.font = { bold: true, color: { argb: COR.cabecalhoTxt }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.cabecalho } }
    cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' }
    cell.border = { bottom: { style: 'thin', color: { argb: '000000' } } }
  })
  ws.getRow(5).height = 22

  // ── Dados ───────────────────────────────────────────────────────────────
  dados.forEach((d, i) => {
    const row = ws.getRow(6 + i)
    const num = numFromValor(d.valor)

    row.getCell(1).value = d.data

    row.getCell(2).value = isAbsoluto ? num : num / 100
    row.getCell(2).numFmt = isAbsoluto ? '#,##0.0000' : '0.0000%'

    if (isAbsoluto) {
      if (d.variacaoMes !== null) {
        row.getCell(3).value = d.variacaoMes / 100
        row.getCell(3).numFmt = '+0.00%;-0.00%;0.00%'
      } else {
        row.getCell(3).value = ''
      }
    } else {
      row.getCell(3).value = ''
    }

    if (d.acumuladoAno !== null) {
      row.getCell(4).value = d.acumuladoAno / 100
      row.getCell(4).numFmt = '+0.00%;-0.00%;0.00%'
    } else {
      row.getCell(4).value = ''
    }

    if (d.acumulado12m !== null) {
      row.getCell(5).value = d.acumulado12m / 100
      row.getCell(5).numFmt = '+0.00%;-0.00%;0.00%'
    } else {
      row.getCell(5).value = ''
    }

    // Alinhamento
    row.getCell(1).alignment = { horizontal: 'left' }
    for (let c = 2; c <= 5; c++) {
      row.getCell(c).alignment = { horizontal: 'right' }
    }

    // Cores condicionais para variações
    const colorirVariacao = (col: number, valor: number | null) => {
      if (valor === null) return
      const cell = row.getCell(col)
      if (valor > 0) cell.font = { color: { argb: COR.verde } }
      else if (valor < 0) cell.font = { color: { argb: COR.vermelho } }
    }
    if (isAbsoluto) colorirVariacao(3, d.variacaoMes)
    colorirVariacao(4, d.acumuladoAno)
    colorirVariacao(5, d.acumulado12m)

    // Pra taxa_mensal, colore o valor principal também
    if (!isAbsoluto) {
      if (num > 0) row.getCell(2).font = { color: { argb: COR.verde } }
      else if (num < 0) row.getCell(2).font = { color: { argb: COR.vermelho } }
    }

    // Linhas zebradas
    if (i % 2 === 0) {
      for (let c = 1; c <= 5; c++) {
        const cell = row.getCell(c)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.linhaAlt } }
      }
    }
  })

  // ── Larguras das colunas ────────────────────────────────────────────────
  ws.columns = [
    { width: 14 },
    { width: 18 },
    { width: 13 },
    { width: 13 },
    { width: 16 },
  ]

  // ── Rodapé ──────────────────────────────────────────────────────────────
  const rodapeRow = dados.length + 7
  ws.mergeCells(`A${rodapeRow}:E${rodapeRow}`)
  const rodape = ws.getCell(`A${rodapeRow}`)
  rodape.value = `Gerado em ${new Date().toLocaleString('pt-BR')} · Matemático.com.br`
  rodape.font = { size: 9, italic: true, color: { argb: COR.cinza } }
  rodape.alignment = { horizontal: 'center' }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
