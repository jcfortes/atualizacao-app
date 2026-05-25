'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { INDICE_LABEL, type Indice } from '@/lib/indices'

// ── Estilos ──────────────────────────────────────────────────────────────────

const cor = {
  verde: '#059669',
  verdeClaro: '#d1fae5',
  verdeBorda: '#6ee7b7',
  cinza: '#6b7280',
  cinzaClaro: '#f9fafb',
  cinzaBorda: '#e5e7eb',
  preto: '#111827',
  branco: '#ffffff',
}

const s = StyleSheet.create({
  page: { backgroundColor: cor.branco, padding: 40, fontFamily: 'Helvetica' },

  // Cabeçalho
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: cor.verde },
  logoBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoM: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: cor.preto },
  logoPonto: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: cor.verde },
  logoSub: { fontSize: 9, color: cor.cinza, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerTipo: { fontSize: 8, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 1 },
  headerData: { fontSize: 8, color: cor.cinza, marginTop: 2 },

  // Título
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: cor.preto, marginBottom: 4 },
  subtitulo: { fontSize: 9, color: cor.cinza, marginBottom: 20 },

  // Card resultado principal
  cardPrincipal: { backgroundColor: cor.verdeClaro, borderWidth: 1, borderColor: cor.verdeBorda, borderRadius: 8, padding: 16, marginBottom: 16 },
  labelPrincipal: { fontSize: 8, color: cor.verde, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  valorPrincipal: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#065f46', marginBottom: 4 },
  infoPrincipal: { fontSize: 9, color: '#047857' },

  // Grid KPIs
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: cor.cinzaClaro, borderWidth: 1, borderColor: cor.cinzaBorda, borderRadius: 6, padding: 10 },
  kpiLabel: { fontSize: 7, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  kpiValor: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: cor.preto },
  kpiValorVerde: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: cor.verde },

  // Seção
  secaoTitulo: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: cor.cinza, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },

  // Tabela histórica com 5 colunas
  tabela: { borderWidth: 1, borderColor: cor.cinzaBorda, borderRadius: 6, overflow: 'hidden' },
  tabelaHeader: { flexDirection: 'row', backgroundColor: '#1f2937', paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: cor.cinzaBorda },
  thMes:          { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  thTaxa:         { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' },
  thFatorMensal:  { width: '18%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' },
  thFatorAcum:    { width: '18%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' },
  thValor:        { width: '36%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' },

  tabelaRow:    { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  tabelaRowAlt: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, backgroundColor: cor.cinzaClaro, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },

  tdMes:         { width: '14%', fontSize: 7.5, color: cor.preto },
  tdTaxa:        { width: '14%', fontSize: 7.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdFatorMensal: { width: '18%', fontSize: 7.5, textAlign: 'right', color: '#374151' },
  tdFatorAcum:   { width: '18%', fontSize: 7.5, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: cor.preto },
  tdValor:       { width: '36%', fontSize: 7.5, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: cor.verde },

  taxaPos: { color: cor.verde },
  taxaNeg: { color: '#dc2626' },

  // Nota e rodapé
  nota: { marginTop: 12, padding: 8, backgroundColor: '#fef9c3', borderRadius: 4, borderWidth: 0.5, borderColor: '#fde68a' },
  notaText: { fontSize: 7, color: '#92400e' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: cor.cinzaBorda, paddingTop: 8 },
  footerText: { fontSize: 7, color: cor.cinza },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(4).replace('.', ',')}%`
}

function fmtFator(v: number) {
  return v.toFixed(6).replace('.', ',')
}

function fmtMes(mesAno: string) {
  const meses = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const partes = mesAno.split('/')
  // Formato DD/MM/AAAA → pega índice 1 (mês) e 2 (ano)
  if (partes.length === 3) {
    const mm = partes[1]
    const aaaa = partes[2]
    return `${meses[parseInt(mm)] ?? mm}/${aaaa}`
  }
  // Formato MM/AAAA
  if (partes.length === 2) {
    const mm = partes[0]
    const aaaa = partes[1]
    return `${meses[parseInt(mm)] ?? mm}/${aaaa}`
  }
  return mesAno
}

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Interfaces ───────────────────────────────────────────────────────────────

interface Resultado {
  valor_original: number
  valor_corrigido: number
  fator: number
  variacao_pct: number
  periodos: number
  dados: { data: string; valor: string }[]
}

interface Props {
  resultado: Resultado
  indice: Indice
  inicio: string
  fim: string
}

// ── Cálculo da série acumulada ────────────────────────────────────────────────

interface LinhaSerie {
  mes: string
  taxa: number
  fatorMensal: number
  fatorAcumulado: number
  valorCorrigido: number
}

function calcularSerie(dados: { data: string; valor: string }[], valorOriginal: number): LinhaSerie[] {
  let fatorAcumulado = 1
  return dados.map((d) => {
    const taxa = parseFloat(d.valor.replace(',', '.'))
    const fatorMensal = 1 + taxa / 100
    fatorAcumulado = fatorAcumulado * fatorMensal
    return {
      mes: d.data,
      taxa,
      fatorMensal,
      fatorAcumulado,
      valorCorrigido: valorOriginal * fatorAcumulado,
    }
  })
}

// ── Documento PDF ─────────────────────────────────────────────────────────────

function LaudoDoc({ resultado, indice, inicio, fim }: Props) {
  const nomeFim = INDICE_LABEL[indice]
  const serie = calcularSerie(resultado.dados, resultado.valor_original)

  function mesLabel(ym: string) {
    const [a, m] = ym.split('-')
    return `${m}/${a}`
  }

  return (
    <Document title={`Laudo de Atualização Monetária — ${indice}`} author="matemático.com.br">
      <Page size="A4" style={s.page}>

        {/* Cabeçalho */}
        <View style={s.header} fixed>
          <View>
            <View style={s.logoBox}>
              <Text style={s.logoM}>M</Text>
              <Text style={s.logoPonto}>.</Text>
            </View>
            <Text style={s.logoSub}>matemático.com.br</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTipo}>Laudo de Atualização Monetária</Text>
            <Text style={s.headerData}>Emitido em {hoje()}</Text>
          </View>
        </View>

        {/* Título */}
        <Text style={s.titulo}>Atualização pelo {indice}</Text>
        <Text style={s.subtitulo}>{nomeFim} · Período: {mesLabel(inicio)} a {mesLabel(fim)} ({resultado.periodos} meses)</Text>

        {/* Card valor corrigido */}
        <View style={s.cardPrincipal}>
          <Text style={s.labelPrincipal}>Valor corrigido</Text>
          <Text style={s.valorPrincipal}>{moeda(resultado.valor_corrigido)}</Text>
          <Text style={s.infoPrincipal}>
            Variação acumulada: {pct(resultado.variacao_pct)}  ·  Fator de correção: {fmtFator(resultado.fator)}
          </Text>
        </View>

        {/* KPIs */}
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Valor original</Text>
            <Text style={s.kpiValor}>{moeda(resultado.valor_original)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Diferença</Text>
            <Text style={s.kpiValorVerde}>{moeda(resultado.valor_corrigido - resultado.valor_original)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Índice</Text>
            <Text style={s.kpiValor}>{indice}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Períodos</Text>
            <Text style={s.kpiValor}>{resultado.periodos} meses</Text>
          </View>
        </View>

        {/* Tabela histórica com valores calculados */}
        <Text style={s.secaoTitulo}>Evolução mês a mês — {indice}</Text>
        <View style={s.tabela}>
          {/* Header */}
          <View style={s.tabelaHeader} fixed>
            <Text style={s.thMes}>Mês</Text>
            <Text style={s.thTaxa}>Taxa (%)</Text>
            <Text style={s.thFatorMensal}>Fator Mensal</Text>
            <Text style={s.thFatorAcum}>Fator Acum.</Text>
            <Text style={s.thValor}>Valor Corrigido</Text>
          </View>

          {/* Linha zero — valor original */}
          <View style={[s.tabelaRow, { backgroundColor: '#eff6ff' }]}>
            <Text style={[s.tdMes, { color: '#1e40af', fontFamily: 'Helvetica-Bold' }]}>Valor original (base)</Text>
            <Text style={[s.tdTaxa, { color: '#9ca3af' }]}>—</Text>
            <Text style={[s.tdFatorMensal, { color: '#9ca3af' }]}>1,000000</Text>
            <Text style={[s.tdFatorAcum, { color: '#9ca3af' }]}>1,000000</Text>
            <Text style={[s.tdValor, { color: '#1d4ed8' }]}>{moeda(resultado.valor_original)}</Text>
          </View>

          {/* Linhas mensais */}
          {serie.map((linha, i) => {
            const isPos = linha.taxa >= 0
            return (
              <View key={i} style={i % 2 === 0 ? s.tabelaRow : s.tabelaRowAlt}>
                <Text style={s.tdMes}>{fmtMes(linha.mes)}</Text>
                <Text style={[s.tdTaxa, isPos ? s.taxaPos : s.taxaNeg]}>
                  {linha.taxa.toFixed(4).replace('.', ',')}%
                </Text>
                <Text style={s.tdFatorMensal}>
                  {linha.fatorMensal.toFixed(6).replace('.', ',')}
                </Text>
                <Text style={s.tdFatorAcum}>
                  {linha.fatorAcumulado.toFixed(6).replace('.', ',')}
                </Text>
                <Text style={s.tdValor}>
                  {moeda(linha.valorCorrigido)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Nota */}
        <View style={s.nota}>
          <Text style={s.notaText}>
            Fonte dos dados: Banco Central do Brasil (api.bcb.gov.br) · Os dados refletem os índices oficiais publicados pelo IBGE/FGV/BCB.
            O valor corrigido de cada mês representa a aplicação do fator acumulado até aquele período sobre o valor original.
            Este laudo é gerado automaticamente e tem caráter informativo.
          </Text>
        </View>

        {/* Rodapé */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>matemático.com.br — Clareza Financeira</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

// ── Botão de exportar ─────────────────────────────────────────────────────────

export function BotaoExportarPDF({ resultado, indice, inicio, fim }: Props) {
  async function exportar() {
    const blob = await pdf(
      <LaudoDoc resultado={resultado} indice={indice} inicio={inicio} fim={fim} />
    ).toBlob()

    const [ai, mi] = inicio.split('-')
    const [af, mf] = fim.split('-')
    const nome = `Laudo_${indice}_${mi}-${ai}_${mf}-${af}.pdf`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportar}
      className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-sm"
    >
      <span>📄</span>
      Exportar Laudo PDF
    </button>
  )
}
