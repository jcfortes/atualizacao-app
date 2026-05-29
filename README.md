# Sistema de Atualização Monetária

> **Parte da plataforma [Matemático.com.br](https://matematico.com.br)** — clareza financeira para profissionais e tomadores de crédito.

Aplicativo web para **atualização monetária** de valores por **índices oficiais** (IPCA, IGP-M, INPC, INCC, CDI, SELIC, TR, Poupança, FGTS, Dólar, Salário Mínimo) e **cestas customizadas** que combinam múltiplos índices com pesos.

Permite **cálculo individual**, **comparativo entre vários índices/cestas** e aplicação de **encargos jurídicos** (juros de mora, multa, despesas) sobre o valor corrigido.

🌐 **Produção:** https://atualizacao.matematico.com.br

---

## 🎯 Para quem é

- **Advogados** que precisam atualizar dívidas, alimentos, indenizações, contratos
- **Contadores** que aplicam correções de contratos, débitos e ativos
- **Consultores financeiros** que calculam rendimentos retroativos
- **Pessoas físicas** que querem entender o valor atualizado de um bem ou dívida

## ⚡ Funcionalidades

### Cálculo individual
- 12 índices oficiais com dados do **Banco Central do Brasil** (SGS)
- Período flexível (mês a mês)
- **Valor original** + atualização → **valor corrigido**, variação acumulada e fator
- Tabela mês a mês com taxa, fator mensal, fator acumulado e valor corrigido

### Encargos jurídicos (opcionais)
Aplicados ao valor já atualizado:
- **Juros de mora** (% a.m., juros simples — padrão jurídico brasileiro)
- **Multa** (%)
- **Outras despesas**: valor fixo em R$ **OU** percentual sobre (VA + juros + multa)
  - Ex.: honorários advocatícios geralmente são percentuais
- **Demonstrativo de composição** completo: valor original → atualizado → juros → multa → despesas → total devido
- **Auto-cálculo** em tempo real ao digitar (debounce 500ms)

### Cestas customizadas
- Crie cestas combinando 2+ índices com pesos personalizados
  - Ex.: 60% IPCA + 40% IGP-M
- Cesta é tratada como um "índice" próprio em todos os cálculos
- Editor visual com validação de pesos

### Comparar Índices
Dois modos automáticos:
- **Sem valor**: mostra apenas variações dos índices no período (qual rendeu mais)
- **Com valor**: aplica correção a cada índice + encargos opcionais
  - Coluna "Total Devido" com encargos aplicados a cada cenário
  - Ordenação pelo maior total

Recursos:
- Pré-seleção via URL (vinda do botão "Comparar com outros índices" da Calculadora)
- Filtro de assuntos
- Detecção de períodos incompletos com sugestão de recálculo até o último mês com dados em todos

### Página por índice
Cada índice tem sua própria página com:
- Definição, origem, periodicidade, fórmula
- Gráfico histórico
- Tabela de valores mês a mês com filtro de período

### Evolução
Gráficos comparativos de múltiplos índices/cestas ao longo do tempo.

### Exportação
- **PDF** (Laudo profissional): KPIs, demonstrativo de composição (se houver encargos), tabela mês a mês
- **Excel**: planilha estruturada com 2 abas (Atualização + Resumo)

### Persistência inteligente
Valor, período e índice ficam salvos no `localStorage` por 7 dias — usuário não precisa redigitar ao navegar entre Calculadora ↔ Comparativo.

---

## 🧱 Stack técnico

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router) |
| Linguagem | **TypeScript** (strict) |
| Banco | **Supabase** (PostgreSQL + RLS + Auth) |
| Fonte de dados | **Banco Central do Brasil** (API SGS) |
| UI | **Tailwind CSS** + componentes customizados |
| Gráficos | **Recharts** |
| PDF | **@react-pdf/renderer** |
| Excel | **ExcelJS** |
| Deploy | **Vercel** |

### Arquitetura
- **App Router** com Server Components por padrão
- **API routes** atuam como proxy para o BCB com cache (`fetch` revalidate)
- **RLS** para cestas customizadas (usuário só vê as suas)
- **Encargos calculados localmente** (motor puro em `lib/encargos.ts`)

---

## 📂 Estrutura

```
app/
├── (app)/                       # Páginas autenticadas
│   ├── calculadora/             # Página de cálculo individual
│   ├── comparativo/             # Comparar Índices
│   ├── evolucao/                # Gráficos históricos
│   ├── indices/[indice]/        # Página por índice (info + histórico)
│   └── cestas/                  # CRUD de cestas customizadas
├── api/
│   ├── corrigir/                # Cálculo individual (chama BCB)
│   ├── comparar/                # Cálculo comparativo
│   ├── serie/                   # Série histórica de um índice
│   └── cestas/                  # CRUD + cálculo de cesta
├── Calculadora.tsx              # Componente da Calculadora (compartilhado)
├── Comparativo.tsx              # Componente do Comparativo
└── LaudoPDF.tsx                 # Geração do PDF

lib/
├── encargos.ts                  # Motor de encargos (juros, multa, despesas)
├── indices.ts                   # Fetch ao BCB + códigos das séries
├── indiceInfo.ts                # Metadados de cada índice
├── cestas.ts                    # Cálculo de cesta
├── useStoredState.ts            # Persistência em localStorage (TTL 7 dias)
├── formatters.ts                # Moeda, data, %, sem símbolo
├── exportExcel.ts
└── exportHistorico.ts           # Export por índice

components/
├── Sidebar.tsx
└── MobileNav.tsx

sql/                             # Migrations
└── cestas_indices.sql
```

---

## 🚀 Como rodar localmente

```bash
git clone https://github.com/jcfortes/atualizacao-app.git
cd atualizacao-app
npm install
```

### Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Banco

Rode `sql/cestas_indices.sql` no Supabase.

### Dev

```bash
npm run dev
```

Abra http://localhost:3000.

> **Sem chave do BCB**: a API SGS é pública e gratuita, não precisa autenticação.

---

## 📜 Padrões da plataforma

Antes de mexer em UI, leia **[../PADROES-PLATAFORMA.md](../PADROES-PLATAFORMA.md)**.

## 🤖 Construído com Claude Code

Veja [CLAUDE.md](./CLAUDE.md).

## 📄 Licença

Proprietário — © José Carlos Fortes / Fortes Tecnologia
