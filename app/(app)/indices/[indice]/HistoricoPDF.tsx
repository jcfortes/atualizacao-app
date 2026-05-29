'use client'

import { Document, Page, Text, View, StyleSheet, pdf, Link } from '@react-pdf/renderer'
import { INDICE_LABEL, type Indice, type TipoIndice } from '@/lib/indices'
import type { DadoEnriquecido } from '@/lib/exportHistorico'

const cor = {
  verde: '#059669',
  verdeClaro: '#d1fae5',
  verdeBorda: '#6ee7b7',
  cinza: '#6b7280',
  cinzaClaro: '#f9fafb',
  cinzaBorda: '#e5e7eb',
  preto: '#111827',
  branco: '#ffffff',
  vermelho: '#dc2626',
}

const s = StyleSheet.create({
  page: { backgroundColor: cor.branco, padding: 32, fontFamily: 'Helvetica', fontSize: 9 },

  // Cabeçalho
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: cor.verde },
  logoBox: { flexDirection: 'row', alignItems: 'center' },
  logoM: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: cor.preto },
  logoPonto: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: cor.verde },
  logoSub: { fontSize: 8, color: cor.cinza, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  headerTipo: { fontSize: 7, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 1 },
  headerData: { fontSize: 7, color: cor.cinza, marginTop: 2 },

  // Título
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: cor.preto, marginBottom: 4 },
  subtitulo: { fontSize: 9, color: cor.cinza, marginBottom: 14 },

  // KPIs
  kpiGrid: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: cor.cinzaClaro, borderWidth: 1, borderColor: cor.cinzaBorda, borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 6, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  kpiValor: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: cor.preto },
  kpiValorVerde: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: cor.verde },
  kpiValorVermelho: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: cor.vermelho },

  // Tabela
  tabela: { borderWidth: 1, borderColor: cor.cinzaBorda, borderRadius: 3 },
  tabelaHeader: { flexDirection: 'row', backgroundColor: cor.preto, paddingVertical: 5, paddingHorizontal: 8 },
  tabelaHeaderCell: { color: cor.branco, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tabelaRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 8, borderTopWidth: 0.5, borderTopColor: cor.cinzaBorda },
  tabelaRowAlt: { backgroundColor: cor.cinzaClaro },
  tabelaCell: { fontSize: 8, color: cor.preto },
  tabelaCellVerde: { fontSize: 8, color: cor.verde, fontFamily: 'Helvetica-Bold' },
  tabelaCellVermelho: { fontSize: 8, color: cor.vermelho, fontFamily: 'Helvetica-Bold' },
  tabelaCellCinza: { fontSize: 8, color: '#9ca3af' },

  // Rodapé com paginação
  rodape: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: cor.cinzaBorda, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  rodapeText: { fontSize: 7, color: cor.cinza },
})

// ── Larguras das colunas (devem somar 100%) ─────────────────────────────────
const COLS_ABSOLUTO = { data: '20%', valor: '24%', varMes: '18%', acumAno: '19%', acum12m: '19%' }
const COLS_TAXA = { data: '24%', valor: '28%', acumAno: '24%', acum12m: '24%' }

function moeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function moedaSemSimbolo(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function pct(v: number | null): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')}%`
}

function pctTaxa(num: number): string {
  return `${num.toFixed(4).replace('.', ',')}%`
}

function HistoricoDoc({ indice, tipo, dados, labelCustom }: { indice: Indice | string; tipo: TipoIndice; dados: DadoEnriquecido[]; labelCustom?: string }) {
  const isAbsoluto = tipo === 'valor_absoluto'
  const ultimo = dados[0]
  const dataGeracao = new Date().toLocaleString('pt-BR')
  const labelTitulo = labelCustom ?? INDICE_LABEL[indice as Indice] ?? String(indice)

  // PDF tem limite de tamanho — limitando a 500 registros mais recentes (de ~10k+)
  const MAX_LINHAS = 500
  const dadosMostrar = dados.slice(0, MAX_LINHAS)
  const truncado = dados.length > MAX_LINHAS

  function corStyle(v: number | null) {
    if (v === null) return s.tabelaCellCinza
    if (v > 0) return s.tabelaCellVerde
    if (v < 0) return s.tabelaCellVermelho
    return s.tabelaCell
  }

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* Cabeçalho */}
        <View style={s.header} fixed>
          <View>
            <Link src="https://matematico.com.br" style={{ textDecoration: 'none' }}>
              <View style={s.logoBox}>
                <Text style={s.logoM}>matemático</Text>
                <Text style={s.logoPonto}>.</Text>
              </View>
            </Link>
            <Text style={s.logoSub}>clareza financeira</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTipo}>Histórico de Índice</Text>
            <Text style={s.headerData}>{dataGeracao}</Text>
          </View>
        </View>

        {/* Título */}
        <Text style={s.titulo}>{labelTitulo}</Text>
        <Text style={s.subtitulo}>
          {dados.length.toLocaleString('pt-BR')} registros · {dados[dados.length - 1]?.data ?? '—'} a {dados[0]?.data ?? '—'} · Fonte: BCB / SGS
        </Text>

        {/* KPIs */}
        {ultimo && (
          <View style={s.kpiGrid}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Último ({ultimo.data})</Text>
              <Text style={s.kpiValor}>
                {isAbsoluto
                  ? moeda(parseFloat(ultimo.valor.replace(',', '.')))
                  : pctTaxa(parseFloat(ultimo.valor.replace(',', '.')))}
              </Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>{isAbsoluto ? 'Variação no mês' : 'Taxa do mês'}</Text>
              <Text
                style={
                  ultimo.variacaoMes === null
                    ? s.kpiValor
                    : ultimo.variacaoMes > 0
                      ? s.kpiValorVerde
                      : ultimo.variacaoMes < 0
                        ? s.kpiValorVermelho
                        : s.kpiValor
                }
              >
                {pct(ultimo.variacaoMes)}
              </Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Acumulado no ano</Text>
              <Text
                style={
                  ultimo.acumuladoAno === null
                    ? s.kpiValor
                    : ultimo.acumuladoAno > 0
                      ? s.kpiValorVerde
                      : ultimo.acumuladoAno < 0
                        ? s.kpiValorVermelho
                        : s.kpiValor
                }
              >
                {pct(ultimo.acumuladoAno)}
              </Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Acumulado 12 meses</Text>
              <Text
                style={
                  ultimo.acumulado12m === null
                    ? s.kpiValor
                    : ultimo.acumulado12m > 0
                      ? s.kpiValorVerde
                      : ultimo.acumulado12m < 0
                        ? s.kpiValorVermelho
                        : s.kpiValor
                }
              >
                {pct(ultimo.acumulado12m)}
              </Text>
            </View>
          </View>
        )}

        {/* Tabela */}
        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            {isAbsoluto ? (
              <>
                <Text style={[s.tabelaHeaderCell, { width: COLS_ABSOLUTO.data }]}>Data</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_ABSOLUTO.valor, textAlign: 'right' }]}>Cotação (R$)</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_ABSOLUTO.varMes, textAlign: 'right' }]}>Var. mês</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_ABSOLUTO.acumAno, textAlign: 'right' }]}>Acum. ano</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_ABSOLUTO.acum12m, textAlign: 'right' }]}>Acum. 12m</Text>
              </>
            ) : (
              <>
                <Text style={[s.tabelaHeaderCell, { width: COLS_TAXA.data }]}>Data</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_TAXA.valor, textAlign: 'right' }]}>Taxa (% a.m.)</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_TAXA.acumAno, textAlign: 'right' }]}>Acum. ano</Text>
                <Text style={[s.tabelaHeaderCell, { width: COLS_TAXA.acum12m, textAlign: 'right' }]}>Acum. 12m</Text>
              </>
            )}
          </View>

          {dadosMostrar.map((d, i) => {
            const taxaNum = parseFloat(d.valor.replace(',', '.'))
            const valorPrincipalStyle = isAbsoluto
              ? s.tabelaCell
              : taxaNum > 0
                ? s.tabelaCellVerde
                : taxaNum < 0
                  ? s.tabelaCellVermelho
                  : s.tabelaCellCinza

            return (
              <View key={`${d.data}-${i}`} style={[s.tabelaRow, i % 2 === 0 ? s.tabelaRowAlt : {}]} wrap={false}>
                {isAbsoluto ? (
                  <>
                    <Text style={[s.tabelaCell, { width: COLS_ABSOLUTO.data }]}>{d.data}</Text>
                    <Text style={[valorPrincipalStyle, { width: COLS_ABSOLUTO.valor, textAlign: 'right' }]}>{moedaSemSimbolo(taxaNum)}</Text>
                    <Text style={[corStyle(d.variacaoMes), { width: COLS_ABSOLUTO.varMes, textAlign: 'right' }]}>{pct(d.variacaoMes)}</Text>
                    <Text style={[corStyle(d.acumuladoAno), { width: COLS_ABSOLUTO.acumAno, textAlign: 'right' }]}>{pct(d.acumuladoAno)}</Text>
                    <Text style={[corStyle(d.acumulado12m), { width: COLS_ABSOLUTO.acum12m, textAlign: 'right' }]}>{pct(d.acumulado12m)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.tabelaCell, { width: COLS_TAXA.data }]}>{d.data}</Text>
                    <Text style={[valorPrincipalStyle, { width: COLS_TAXA.valor, textAlign: 'right' }]}>{pctTaxa(taxaNum)}</Text>
                    <Text style={[corStyle(d.acumuladoAno), { width: COLS_TAXA.acumAno, textAlign: 'right' }]}>{pct(d.acumuladoAno)}</Text>
                    <Text style={[corStyle(d.acumulado12m), { width: COLS_TAXA.acum12m, textAlign: 'right' }]}>{pct(d.acumulado12m)}</Text>
                  </>
                )}
              </View>
            )
          })}
        </View>

        {truncado && (
          <Text style={[s.subtitulo, { marginTop: 8, textAlign: 'center', fontStyle: 'italic' }]}>
            ⓘ Exibindo os {MAX_LINHAS} registros mais recentes de {dados.length.toLocaleString('pt-BR')} disponíveis. Use o Excel para a série completa.
          </Text>
        )}

        {/* Rodapé fixo */}
        <View style={s.rodape} fixed>
          <Text style={s.rodapeText}>
            <Link src="https://matematico.com.br" style={{ color: cor.cinza, textDecoration: 'none' }}>
              matematico.com.br
            </Link>
            {' · Dados oficiais BCB/SGS'}
          </Text>
          <Text style={s.rodapeText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// ── Botão ──────────────────────────────────────────────────────────────────

export function BotaoExportarPDFHistorico({
  indice,
  tipo,
  dados,
  labelCustom,
}: {
  indice: Indice | string
  tipo: TipoIndice
  dados: DadoEnriquecido[]
  labelCustom?: string
}) {
  async function exportar() {
    const blob = await pdf(<HistoricoDoc indice={indice} tipo={tipo} dados={dados} labelCustom={labelCustom} />).toBlob()
    const nomeArquivo = labelCustom
      ? `Historico_Cesta_${labelCustom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      : `Historico_${indice}_${new Date().toISOString().slice(0, 10)}.pdf`
    const nome = nomeArquivo
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
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-sm"
    >
      <span>📄</span>
      Exportar PDF
    </button>
  )
}
