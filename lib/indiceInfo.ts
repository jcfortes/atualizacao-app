import { type Indice } from './indices'

export interface IndiceInfo {
  nomeCompleto: string
  resumo: string
  quemCalcula: string
  desdeQuando: string
  periodicidade: string
  metodologia: string
  usoTipico: string[]
  vantagens: string[]
  limitacoes: string[]
  baseLegal?: string
  fontes: { label: string; url: string }[]
}

export const INDICE_INFO: Record<Indice, IndiceInfo> = {
  IPCA: {
    nomeCompleto: 'IPCA — Índice Nacional de Preços ao Consumidor Amplo',
    resumo: 'Indicador oficial de inflação do Brasil. Usado pelo Banco Central como meta da política monetária.',
    quemCalcula: 'IBGE — Instituto Brasileiro de Geografia e Estatística',
    desdeQuando: 'Janeiro/1980',
    periodicidade: 'Mensal — divulgado por volta do dia 10 do mês seguinte',
    metodologia: 'Mede a variação dos preços de uma cesta de produtos e serviços consumidos pelas famílias com renda de 1 a 40 salários mínimos em 13 regiões metropolitanas brasileiras.',
    usoTipico: [
      'Meta de inflação do Banco Central (Sistema de Metas)',
      'Reajuste anual do salário mínimo (parcialmente)',
      'Correção de aluguéis residenciais e comerciais',
      'Atualização de débitos judiciais (CJF / Justiça Federal)',
      'Contratos de longo prazo (energia, planos de saúde, mensalidades)',
    ],
    vantagens: [
      'Cobertura geográfica ampla (13 regiões metropolitanas)',
      'Metodologia consolidada e auditável',
      'Reconhecido internacionalmente',
      'Pouco volátil — bom para contratos de longo prazo',
    ],
    limitacoes: [
      'Cesta padrão pode não refletir o consumo individual',
      'Foco em áreas metropolitanas (menos representativo para zonas rurais)',
    ],
    baseLegal: 'Adotado como meta oficial de inflação pelo Conselho Monetário Nacional (CMN) desde 1999.',
    fontes: [
      { label: 'IBGE — IPCA', url: 'https://www.ibge.gov.br/explica/inflacao.php' },
      { label: 'BCB / SGS — Série 433', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  IGPM: {
    nomeCompleto: 'IGP-M — Índice Geral de Preços do Mercado',
    resumo: 'Índice de inflação mais amplo da economia, conhecido como "inflação do aluguel" por ter sido tradicionalmente usado para reajuste de contratos de locação.',
    quemCalcula: 'FGV — Fundação Getulio Vargas (IBRE)',
    desdeQuando: 'Junho/1989',
    periodicidade: 'Mensal — divulgado no fim do próprio mês (entre dia 26 e 30)',
    metodologia: 'Composto por: 60% IPA-M (preços ao produtor amplo), 30% IPC-M (preços ao consumidor) e 10% INCC-M (construção civil). Coleta de preços entre os dias 21 do mês anterior e 20 do mês de referência.',
    usoTipico: [
      'Reajuste de contratos de aluguel (tradicional)',
      'Tarifas de energia elétrica reguladas pela ANEEL',
      'Contratos comerciais e industriais de longo prazo',
      'Planos de saúde (alguns)',
    ],
    vantagens: [
      'Antecipa pressões inflacionárias (mede o atacado)',
      'Divulgação rápida (no próprio mês)',
      'Histórico longo e consolidado',
    ],
    limitacoes: [
      'Mais volátil que o IPCA',
      'Muito influenciado por câmbio e commodities',
      'Em períodos de alta do dólar pode "explodir" e gerar litígios em contratos de aluguel',
    ],
    fontes: [
      { label: 'FGV — IGP-M', url: 'https://portalibre.fgv.br/igp' },
      { label: 'BCB / SGS — Série 189', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  IGPDI: {
    nomeCompleto: 'IGP-DI — Índice Geral de Preços - Disponibilidade Interna',
    resumo: 'Versão "alternativa" do IGP-M com a mesma composição (60/30/10) mas período de coleta diferente — do dia 1 ao 30 do mês de referência (mês fechado).',
    quemCalcula: 'FGV — Fundação Getulio Vargas (IBRE)',
    desdeQuando: 'Fevereiro/1944',
    periodicidade: 'Mensal — divulgado no início do mês seguinte (por volta do dia 10)',
    metodologia: 'Mesma composição do IGP-M (60% IPA + 30% IPC + 10% INCC), mas com período de coleta abrangendo o mês civil completo (dia 1 ao 30).',
    usoTipico: [
      'Contratos antigos (anteriores ao IGP-M, criado em 1989)',
      'Análises econômicas que precisam de série histórica longa',
      'Contratos públicos e regulatórios',
    ],
    vantagens: [
      'Série histórica muito longa (desde 1944)',
      'Cobertura completa do mês civil',
    ],
    limitacoes: [
      'Divulgado mais tarde que o IGP-M',
      'Mesmas limitações do IGP-M (volatilidade, peso do atacado)',
    ],
    fontes: [
      { label: 'FGV — IGP-DI', url: 'https://portalibre.fgv.br/igp' },
      { label: 'BCB / SGS — Série 190', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  INPC: {
    nomeCompleto: 'INPC — Índice Nacional de Preços ao Consumidor',
    resumo: 'Versão do IPCA focada em famílias de baixa renda (1 a 5 salários mínimos). Usado tradicionalmente em correção de salários e benefícios trabalhistas.',
    quemCalcula: 'IBGE — Instituto Brasileiro de Geografia e Estatística',
    desdeQuando: 'Março/1979',
    periodicidade: 'Mensal — divulgado junto com o IPCA',
    metodologia: 'Mesma estrutura de coleta do IPCA, mas considerando a cesta de consumo das famílias com renda entre 1 e 5 salários mínimos. Pesos dos produtos refletem o consumo desse público (mais alimentação, transporte público, etc.).',
    usoTipico: [
      'Reajuste do salário mínimo (referência principal)',
      'Reajuste de aposentadorias e pensões do INSS (acima do piso)',
      'Correção de débitos trabalhistas',
      'Acordos coletivos de trabalho',
    ],
    vantagens: [
      'Reflete melhor o impacto inflacionário sobre famílias de baixa renda',
      'Metodologia robusta do IBGE',
      'Histórico longo',
    ],
    limitacoes: [
      'Cesta de produtos limitada ao perfil da baixa renda',
      'Pode divergir significativamente do IPCA em períodos de alta de alimentos',
    ],
    fontes: [
      { label: 'IBGE — INPC', url: 'https://www.ibge.gov.br/explica/inflacao.php' },
      { label: 'BCB / SGS — Série 188', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  INCC: {
    nomeCompleto: 'INCC-M — Índice Nacional de Custo da Construção (Mercado)',
    resumo: 'Mede a variação dos custos da construção civil — materiais, mão de obra e serviços. Indexador padrão de contratos de incorporação imobiliária na fase de obra.',
    quemCalcula: 'FGV — Fundação Getulio Vargas',
    desdeQuando: 'Janeiro/1985 (INCC-M)',
    periodicidade: 'Mensal — divulgado junto com o IGP-M',
    metodologia: 'Acompanha a variação dos preços de materiais de construção, mão de obra, equipamentos e serviços usados em obras residenciais e comerciais em 18 capitais.',
    usoTipico: [
      'Reajuste de contratos de compra de imóveis na planta (fase de construção)',
      'Reajuste de contratos com construtoras',
      'Análise de custos do setor imobiliário',
    ],
    vantagens: [
      'Reflete diretamente o setor da construção',
      'Cobertura geográfica de 18 capitais',
      'Padrão de mercado para incorporadoras',
    ],
    limitacoes: [
      'Tende a subir mais rápido que IPCA em períodos de aquecimento da construção',
      'Pode penalizar o comprador na fase de obra',
    ],
    fontes: [
      { label: 'FGV — INCC', url: 'https://portalibre.fgv.br/incc' },
      { label: 'BCB / SGS — Série 192', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  CDI: {
    nomeCompleto: 'CDI — Certificado de Depósito Interbancário',
    resumo: 'Taxa média das operações de empréstimo entre bancos. Principal referência de rentabilidade do mercado de renda fixa.',
    quemCalcula: 'B3 / CETIP — apurada e divulgada pela B3',
    desdeQuando: 'Década de 1980',
    periodicidade: 'Diária — acumulada mensalmente para correção monetária',
    metodologia: 'Média ponderada das taxas das operações de empréstimo de um dia (overnight) entre instituições financeiras, registradas na CETIP. Costuma ficar muito próxima da SELIC (geralmente 0,10% abaixo).',
    usoTipico: [
      'Referência de rendimento de CDBs, LCIs, LCAs (% do CDI)',
      'Correção de contratos financeiros',
      'Benchmark de fundos de renda fixa',
      'Operações no mercado interbancário',
    ],
    vantagens: [
      'Atualizada diariamente',
      'Reflete o custo real do dinheiro no sistema bancário',
      'Padrão de mercado consolidado',
    ],
    limitacoes: [
      'Não é uma "inflação" — é taxa de juros',
      'Em períodos de SELIC baixa, rende pouco',
    ],
    fontes: [
      { label: 'B3 — CDI', url: 'https://www.b3.com.br/' },
      { label: 'BCB / SGS — Série 4391', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  SELIC: {
    nomeCompleto: 'SELIC — Sistema Especial de Liquidação e Custódia',
    resumo: 'Taxa básica de juros da economia brasileira, definida pelo COPOM. Balizadora de todas as demais taxas de juros do mercado.',
    quemCalcula: 'Banco Central do Brasil (definida pelo COPOM a cada 45 dias)',
    desdeQuando: 'Junho/1986',
    periodicidade: 'Definida em reuniões do COPOM; valor diário disponível, acumulado mensal usado para correção',
    metodologia: 'Taxa média das operações de financiamento de um dia, lastreadas em títulos públicos federais, registradas no Sistema Especial de Liquidação e Custódia (SELIC). É a principal ferramenta do Banco Central para controlar a inflação.',
    usoTipico: [
      'Instrumento de política monetária (controle de inflação)',
      'Correção de tributos federais em atraso',
      'Atualização de débitos judiciais em alguns casos',
      'Rentabilidade do Tesouro Direto (Tesouro Selic)',
    ],
    vantagens: [
      'Taxa oficial — definida pelo Banco Central',
      'Reflete diretamente a política monetária',
      'Aplicável em correções tributárias',
    ],
    limitacoes: [
      'Não é "inflação" — é taxa de juros',
      'Pode variar significativamente em curtos períodos',
    ],
    baseLegal: 'Definida pelo COPOM (Comitê de Política Monetária do Banco Central), criado pela Circular nº 2.698/1996.',
    fontes: [
      { label: 'BCB — SELIC', url: 'https://www.bcb.gov.br/controleinflacao/taxaselic' },
      { label: 'BCB / SGS — Série 4390', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  TR: {
    nomeCompleto: 'TR — Taxa Referencial',
    resumo: 'Taxa de remuneração da poupança e do FGTS, calculada pelo Banco Central. Historicamente muito baixa (próxima de zero em períodos de SELIC reduzida).',
    quemCalcula: 'Banco Central do Brasil',
    desdeQuando: 'Fevereiro/1991',
    periodicidade: 'Diária (com valor mensal acumulado)',
    metodologia: 'Calculada a partir da média das taxas dos CDBs prefixados das 30 maiores instituições financeiras, aplicado um "redutor" definido pelo BCB. O redutor faz a TR ficar quase sempre próxima de zero.',
    usoTipico: [
      'Rendimento da Poupança (TR + 0,5% a.m. ou 70% da SELIC)',
      'Rendimento do FGTS (TR + 3% a.a.)',
      'Correção de financiamentos imobiliários do SFH',
      'Algumas modalidades de contratos públicos',
    ],
    vantagens: [
      'Referência oficial e padronizada',
      'Baixa volatilidade',
    ],
    limitacoes: [
      'Quase sempre próxima de zero — perde para a inflação',
      'Não reflete a inflação real do período',
      'Tema de muita controvérsia jurídica (FGTS x inflação)',
    ],
    fontes: [
      { label: 'BCB — TR', url: 'https://www.bcb.gov.br/' },
      { label: 'BCB / SGS — Série 7811', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  POUPANCA: {
    nomeCompleto: 'Poupança — Rendimento Mensal (Nova)',
    resumo: 'Aplicação financeira mais tradicional do Brasil. A regra de rendimento mudou em 04/05/2012; esta série acompanha a poupança "nova" (regra atual).',
    quemCalcula: 'Banco Central do Brasil',
    desdeQuando: 'Maio/2012 (poupança nova)',
    periodicidade: 'Mensal (rendimento na data de aniversário)',
    metodologia: 'Regra atual (nova poupança): quando a SELIC > 8,5% a.a. → rende 0,5% a.m. + TR. Quando a SELIC ≤ 8,5% a.a. → rende 70% da SELIC + TR. Calculada na data de aniversário de cada depósito.',
    usoTipico: [
      'Aplicação financeira de baixo risco',
      'Reserva de emergência (popular)',
      'Referência de rendimento conservador',
      'Comparativo educacional ("rendeu mais que a poupança?")',
    ],
    vantagens: [
      'Isenta de Imposto de Renda',
      'Liquidez diária (sem prazo de carência após o aniversário)',
      'Garantida pelo FGC até R$ 250 mil',
    ],
    limitacoes: [
      'Geralmente rende menos que a inflação',
      'Perde para outras opções de renda fixa (CDB, Tesouro)',
      'Só rende na data de aniversário (saques antes perdem o mês)',
    ],
    fontes: [
      { label: 'BCB — Poupança', url: 'https://www.bcb.gov.br/' },
      { label: 'BCB / SGS — Série 196', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  FGTS: {
    nomeCompleto: 'FGTS — Fundo de Garantia por Tempo de Serviço',
    resumo: 'Rendimento mensal do FGTS: TR + 3% ao ano (= TR + 0,2466% ao mês). Usado em correções trabalhistas e disputas judiciais sobre poder de compra do trabalhador.',
    quemCalcula: 'Caixa Econômica Federal (gestor); base TR vem do BCB',
    desdeQuando: 'Setembro/1966 (criação do FGTS)',
    periodicidade: 'Mensal (creditado na data de aniversário do depósito)',
    metodologia: 'Rendimento fixo: TR (Taxa Referencial) + 3% ao ano, capitalizado mensalmente. Como TR ≈ 0 na maioria dos períodos, o rendimento efetivo do FGTS gira em torno de 3% a.a.',
    usoTipico: [
      'Rentabilidade da conta do FGTS de cada trabalhador',
      'Correção de débitos trabalhistas com base no FGTS',
      'Comparação em ações que buscam reposição de perdas (FGTS x IPCA)',
    ],
    vantagens: [
      'Rendimento previsível e fixo',
      'Garantido pelo governo federal',
    ],
    limitacoes: [
      'Historicamente perde para a inflação (IPCA)',
      'Objeto de várias ações judiciais pleiteando substituição pela inflação',
      'STF já reconheceu a perda inflacionária do FGTS (Tema 1265 de RG)',
    ],
    baseLegal: 'Lei nº 8.036/1990 (define remuneração TR + 3% a.a.); ADI 5.090/STF em curso questionando rendimento.',
    fontes: [
      { label: 'Caixa — FGTS', url: 'https://www.caixa.gov.br/fgts' },
      { label: 'BCB / SGS — TR (Série 7811)', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  USD: {
    nomeCompleto: 'Dólar Americano — Cotação PTAX',
    resumo: 'Taxa de câmbio oficial do dólar americano (venda) usada como referência para conversões. Calculada pelo Banco Central a partir da média das cotações do mercado.',
    quemCalcula: 'Banco Central do Brasil',
    desdeQuando: 'Existência do mercado de câmbio brasileiro',
    periodicidade: 'Diária (PTAX consolidada às 13h e 16h)',
    metodologia: 'Taxa PTAX é a média ponderada das cotações de compra e venda do dólar interbancário em 4 janelas do dia. Aqui usamos a média mensal de fechamento (venda).',
    usoTipico: [
      'Contratos atrelados ao dólar (importação, exportação)',
      'Correção de débitos em moeda estrangeira',
      'Análise de custo de viagens internacionais',
      'Hedge cambial',
    ],
    vantagens: [
      'Referência oficial do Banco Central',
      'Reflete o mercado real (não cotações de turismo)',
      'Histórico longo e auditável',
    ],
    limitacoes: [
      'Alta volatilidade — pode subir/cair muito em poucos dias',
      'Pouco usado para correção de débitos em real',
      'Subir do dólar significa perda de poder de compra do real',
    ],
    fontes: [
      { label: 'BCB — Câmbio', url: 'https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes' },
      { label: 'BCB / SGS — Série 3698', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },

  SM: {
    nomeCompleto: 'Salário Mínimo Nacional',
    resumo: 'Menor remuneração que um trabalhador pode receber por mês de trabalho. Reajustado anualmente pelo governo federal.',
    quemCalcula: 'Governo Federal (reajuste por decreto/lei)',
    desdeQuando: 'Julho/1940 (criação do SM no Brasil)',
    periodicidade: 'Anual — reajustado em janeiro de cada ano',
    metodologia: 'Reajuste anual definido em lei ou decreto, considerando inflação do INPC do ano anterior e, em alguns governos, ganho real (crescimento do PIB). Vale para todo o território nacional.',
    usoTipico: [
      'Piso salarial nacional',
      'Base para cálculo de benefícios previdenciários (BPC, salário-família)',
      'Referência para pensões alimentícias',
      'Múltiplos para classificação social ("X salários mínimos")',
    ],
    vantagens: [
      'Reajustado anualmente para preservar poder de compra',
      'Política pública de combate à desigualdade',
      'Histórico longo e estável',
    ],
    limitacoes: [
      'Reajuste anual — não acompanha inflação dentro do ano',
      'Pode variar conforme política do governo (com ou sem ganho real)',
      'Para correção monetária, raramente é o índice mais adequado',
    ],
    baseLegal: 'Constituição Federal Art. 7º IV; Lei nº 14.663/2023 (política de valorização permanente).',
    fontes: [
      { label: 'Gov.br — Salário Mínimo', url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/trabalhador/salario-minimo' },
      { label: 'BCB / SGS — Série 1619', url: 'https://www3.bcb.gov.br/sgspub/' },
    ],
  },
}
