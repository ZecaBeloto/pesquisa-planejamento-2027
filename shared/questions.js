// Definição das perguntas. Script clássico: roda no navegador e no Apps Script.
var IDENTIFICATION = {
  id: 'identificacao',
  title: 'Identificação',
  questions: [
    {
      n: 0,
      short: 'Nome do assessor',
      text: 'Qual é o seu nome?',
      fields: [{ id: 'nome', type: 'name', required: true, hint: 'Nome e sobrenome' }],
    },
  ],
};

var QUESTIONS = [
  {
    id: 'metas',
    title: 'Bloco 1: Objetivos quantitativos e expansão de carteira',
    kicker: 'Objetivos e expansão de carteira',
    questions: [
      {
        n: 1,
        short: 'Captação Líquida 2027 (R$)',
        text: 'Qual é o seu objetivo de Captação Líquida total para 2027?',
        fields: [{ id: 'q1', type: 'money', required: true, hint: 'Ex.: R$ 25.000.000,00' }],
      },
      {
        n: 2,
        short: 'Abertura de contas',
        text: 'Qual o seu objetivo de novas contas abertas e o ticket médio esperado por conta?',
        fields: [
          { id: 'q2_contas', type: 'int', label: 'Objetivo de contas', required: true, hint: 'Ex.: 24' },
          { id: 'q2_ticket', type: 'money', label: 'Ticket médio (R$)', required: true, hint: 'Ex.: R$ 350.000,00' },
        ],
      },
      {
        n: 3,
        short: 'Origem da captação',
        text: 'Qual percentual dos tipos de captação que pretende ter para ano que vem?',
        fields: [
          {
            id: 'q3',
            type: 'percentGroup',
            required: true,
            options: [
              { id: 'indicacoes', label: 'Indicações da base atual (Member-get-Member)' },
              { id: 'prospeccao', label: 'Prospecção ativa própria (Outbound/Networking)' },
              { id: 'eventos', label: 'Eventos/Treinamentos' },
            ],
          },
        ],
      },
      {
        n: 4,
        short: 'AuC',
        text: 'Projeção de AuC da sua carteira:',
        fields: [{ id: 'q4_meta', type: 'money', label: 'Objetivo de AuC em 31/12/2027 (R$)', required: true }],
      },
      {
        n: 5,
        short: 'Perfil de cliente ideal',
        text: 'Descreva o perfil de cliente que você considera ideal.',
        fields: [{ id: 'q_perfil', type: 'longtext', required: true, hint: 'Ex.: profissão, renda, valor investido etc.' }],
      },
    ],
  },
  {
    id: 'rentabilidade',
    title: 'Bloco 2: Rentabilidade (ROA) e mix de produtos',
    kicker: 'Rentabilidade e mix de produtos',
    questions: [
      {
        n: 6,
        short: 'Objetivo de ROA anual (% a.a.)',
        text: 'Qual o seu objetivo de ROA médio anual da carteira para 2027?',
        fields: [{ id: 'q5', type: 'percent', required: true, hint: 'Ex.: 0,75% a.a.' }],
      },
      {
        n: 7,
        short: 'Prioridade de alocação',
        text: 'Quais classes de ativos serão o foco principal da sua carteira em 2027? (Ordene por prioridade)',
        fields: [
          {
            id: 'q6',
            type: 'rank',
            required: true,
            hint: '1 = maior prioridade. Use cada posição uma única vez.',
            options: [
              { id: 'rf', label: 'Renda Fixa / Crédito Privado (CRI, CRA, Debêntures)' },
              { id: 'rv', label: 'Renda Variável e Derivativos (Ações, Opções, FIIs)' },
              { id: 'consorcios', label: 'Consórcios' },
              { id: 'prev', label: 'Previdência Privada e Seguros' },
              { id: 'recorrente', label: 'Produtos de Receita Recorrente / Carteiras Administradas / Fee Fixo' },
              { id: 'internacional', label: 'Alocações internacionais e câmbio' },
              { id: 'pj', label: 'Produtos PJ' },
              { id: 'credito', label: 'Produtos de Crédito' },
            ],
          },
        ],
      },
      {
        n: 8,
        short: 'Fee-Based vs. Comissionamento',
        text: 'Qual proporção da sua receita você planeja no modelo Fee-Based vs. Comissionamento Tradicional?',
        fields: [
          {
            id: 'q7',
            type: 'percentGroup',
            required: true,
            options: [
              { id: 'fee', label: 'Fee-based / Consultoria' },
              { id: 'transacional', label: 'Transacional / Comissionado' },
            ],
          },
        ],
      },
      {
        n: 9,
        short: 'Cross-sell PJ',
        text: 'Identifica potencial de cross-sell corporativo na base? Se sim, selecione e estime volume:',
        fields: [
          {
            id: 'q8',
            type: 'multi',
            label: 'Soluções',
            required: false,
            options: ['Câmbio', 'Crédito Estruturado / Financiamento', 'M&A / Mercado de Capitais', 'Gestão de Caixa PJ'],
          },
          { id: 'q8_volume', type: 'money', label: 'Volume financeiro total estimado para PJ (R$)', required: false, requiredIf: 'q8' },
        ],
      },
    ],
  },
  {
    id: 'qualidade',
    title: 'Bloco 3: Qualidade, retenção e relacionamento',
    kicker: 'Qualidade, retenção e relacionamento',
    questions: [
      {
        n: 10,
        short: 'Régua de relacionamento',
        text: 'Você possui uma régua de relacionamento definida, com frequência de contato estabelecida de acordo com o perfil e a relevância de cada cliente?',
        fields: [{ id: 'q_regua', type: 'select', required: true, options: ['Sim', 'Não'] }],
      },
      {
        n: 11,
        short: 'Segmentação da carteira',
        text: 'Explique como você segmenta sua carteira, quais critérios utiliza para classificar os clientes e qual a frequência de contato prevista para cada grupo.',
        fields: [{ id: 'q_segmentacao', type: 'longtext', required: true }],
      },
      {
        n: 12,
        short: 'Nota da rotina de relacionamento',
        text: 'Por fim, de 0 a 10, quanto você avalia que está cumprindo essa rotina de relacionamento atualmente?',
        fields: [{ id: 'q_regua_nota', type: 'score', max: 10, required: true, hint: 'De 0 a 10' }],
      },
      {
        n: 13,
        short: 'Teto de churn (% a.a.)',
        text: 'Qual é a taxa máxima aceitável de Churn de Clientes / Evasão de Custódia em 2027?',
        fields: [{ id: 'q10', type: 'percent', required: true, hint: 'Ex.: 3,5% a.a.' }],
      },
      {
        n: 14,
        short: 'Ações para indicações',
        text: 'Quais rotinas ou processos práticos você implementará para transformar clientes promotores em geradores de indicação?',
        fields: [{ id: 'q11', type: 'longtext', required: true }],
      },
    ],
  },
  {
    id: 'estrutura',
    title: 'Bloco 4: Estrutura, capacitação e gargalos operacionais',
    kicker: 'Estrutura, capacitação e gargalos',
    questions: [
      {
        n: 15,
        short: 'Apoio da mesa',
        text: 'Quais materiais de apoio da mesa são mais prioritários para aumentar sua conversão?',
        fields: [
          {
            id: 'q12',
            type: 'multi',
            required: true,
            other: true,
            options: [
              'Relatórios comparativos de carteira e lâminas de produtos',
              'Estruturação de teses macro e carteiras recomendadas',
              'Apoio de especialistas da mesa em reuniões com prospects',
              'Ferramentas de CRM / automação de follow-up',
            ],
          },
        ],
      },
      {
        n: 16,
        short: 'Certificações',
        text: 'Planeja tirar ou renovar certificações em 2027?',
        fields: [
          {
            id: 'q13',
            type: 'multi',
            required: true,
            exclusive: 'Nenhuma / Já certificado',
            options: ['CFP®', 'CGA / CGE', 'CEA', 'PQO / Ancord', 'Cursos de Estruturação Off-shore / Wealth', 'Nenhuma / Já certificado'],
          },
        ],
      },
      {
        n: 17,
        short: 'Reuniões por semana',
        text: 'Quantas reuniões de prospecção e revisão de carteira você pretende realizar por semana para sustentar seu funil?',
        fields: [{ id: 'q14', type: 'int', required: true, hint: 'Ex.: 12 reuniões/semana' }],
      },
      {
        n: 18,
        short: 'Principal gargalo',
        text: 'Qual é o principal gargalo operacional, burocrático ou de rotina que consome seu tempo e impede você de focar no relacionamento e captação?',
        fields: [{ id: 'q15', type: 'longtext', required: true }],
      },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { QUESTIONS: QUESTIONS, IDENTIFICATION: IDENTIFICATION };
