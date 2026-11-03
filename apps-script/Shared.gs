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

// Regras de validação e montagem das abas. Sem dependências: roda no navegador e no Apps Script.
if (typeof module !== 'undefined') {
  var _q = require('./questions.js');
  var QUESTIONS = _q.QUESTIONS;
  var IDENTIFICATION = _q.IDENTIFICATION;
}

var CONSOLIDADO = 'Consolidado';
var TAB_HEADER = ['Pergunta', 'Resposta', 'Enviado em'];
var NOT_APPLICABLE = '–';
var MAX_TAB_NAME = 100;
var MAX_TEXT = 5000;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function parseMoneyBR(text) {
  if (isBlank(text) || typeof text !== 'string') return null;
  var s = text.replace(/R\$/i, '').replace(/\s/g, '');
  var normalized;
  if (/^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(s) || /^\d+(,\d+)?$/.test(s)) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    normalized = s;
  } else {
    return null;
  }
  return Number(normalized);
}

function parsePercentBR(text) {
  if (isBlank(text) || typeof text !== 'string') return null;
  var s = text.replace(/a\.?\s*a\.?/i, '').replace('%', '').replace(/\s/g, '');
  if (!/^\d+([.,]\d+)?$/.test(s)) return null;
  return Number(s.replace(',', '.'));
}

function parseIntBR(text) {
  if (isBlank(text) || typeof text !== 'string') return null;
  var s = text.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

function sumsTo100(values) {
  var cents = 0;
  for (var i = 0; i < values.length; i++) cents += Math.round(values[i] * 100);
  return cents === 10000;
}

function sumOfPercents(rawValues) {
  var cents = 0;
  rawValues.forEach(function (raw) {
    var n = parsePercentBR(raw);
    if (n !== null) cents += Math.round(n * 100);
  });
  return cents / 100;
}

function formatMoneyBR(value) {
  var parts = value.toFixed(2).split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + parts[1];
}

function sanitizeText(text) {
  var s = String(text).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function uniqueTabName(name, existingNames) {
  var base = String(name).trim().replace(/\s+/g, ' ');
  var taken = {};
  existingNames.forEach(function (n) { taken[String(n).toLowerCase()] = true; });
  var fit = function (suffix) { return base.slice(0, MAX_TAB_NAME - suffix.length).trim() + suffix; };
  if (base.toLowerCase() === CONSOLIDADO.toLowerCase()) {
    var reserved = fit(' (assessor)');
    if (!taken[reserved.toLowerCase()]) return reserved;
    base = reserved;
  }
  var candidate = fit('');
  for (var i = 2; taken[candidate.toLowerCase()]; i++) candidate = fit(' (' + i + ')');
  return candidate;
}

function otherText(answers, field) {
  var value = answers[field.id + '_outro'];
  return typeof value === 'string' ? value.trim() : '';
}

function validateField(field, answers) {
  var value = answers[field.id];
  var required = field.required;
  if (field.requiredIf) {
    var parent = answers[field.requiredIf];
    required = Array.isArray(parent) && parent.length > 0;
  }

  switch (field.type) {
    case 'percentGroup': {
      if (!value || typeof value !== 'object') return 'Preencha todos os percentuais.';
      var numbers = [];
      for (var i = 0; i < field.options.length; i++) {
        var n = parsePercentBR(value[field.options[i].id]);
        if (n === null) return 'Preencha todos os percentuais. Use 0 quando não se aplicar.';
        if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return 'Use no máximo duas casas decimais.';
        numbers.push(n);
      }
      return sumsTo100(numbers) ? null : 'A soma dos percentuais deve ser 100%.';
    }
    case 'rank': {
      if (!value || typeof value !== 'object') return 'Ordene todas as opções.';
      var seen = {};
      for (var j = 0; j < field.options.length; j++) {
        var position = parseIntBR(value[field.options[j].id]);
        if (position === null || position < 1 || position > field.options.length) return 'Ordene todas as opções.';
        if (seen[position]) return 'Use cada posição uma única vez.';
        seen[position] = true;
      }
      return null;
    }
    case 'multi': {
      if (value !== undefined && !Array.isArray(value)) return 'Resposta inválida.';
      var selected = value || [];
      for (var k = 0; k < selected.length; k++) {
        if (field.options.indexOf(selected[k]) === -1) return 'Opção inválida.';
      }
      if (field.exclusive && selected.indexOf(field.exclusive) !== -1 && selected.length > 1) {
        return '"' + field.exclusive + '" não pode ser combinada com outras opções.';
      }
      var hasOther = field.other && otherText(answers, field) !== '';
      if (hasOther && otherText(answers, field).length > MAX_TEXT) return 'Texto muito longo.';
      return required && selected.length === 0 && !hasOther ? 'Selecione ao menos uma opção.' : null;
    }
  }

  if (isBlank(value)) return required ? 'Campo obrigatório.' : null;
  if (typeof value !== 'string') return 'Resposta inválida.';
  if (field.requiredIf && !required) return 'Marque ao menos uma opção acima ou apague este valor.';

  switch (field.type) {
    case 'money':
      return parseMoneyBR(value) === null ? 'Informe um valor em R$. Ex.: 25.000.000,00' : null;
    case 'int':
      return parseIntBR(value) === null ? 'Informe um número inteiro.' : null;
    case 'score': {
      var score = parseIntBR(value);
      return score === null || score > field.max ? 'Informe um número inteiro de 0 a ' + field.max + '.' : null;
    }
    case 'percent': {
      var pct = parsePercentBR(value);
      return pct === null || pct > 100 ? 'Informe um percentual. Ex.: 0,75' : null;
    }
    case 'select':
      return field.options.indexOf(value) === -1 ? 'Opção inválida.' : null;
    case 'longtext':
    case 'name':
      return value.length > MAX_TEXT ? 'Texto muito longo.' : null;
  }
  return null;
}

function validateBlock(block, answers) {
  var errors = {};
  block.questions.forEach(function (question) {
    question.fields.forEach(function (field) {
      var message = validateField(field, answers);
      if (message) errors[field.id] = message;
    });
  });
  return errors;
}

function validateSubmission(answers) {
  var errors = {};
  [IDENTIFICATION].concat(QUESTIONS).forEach(function (block) {
    var blockErrors = validateBlock(block, answers);
    Object.keys(blockErrors).forEach(function (id) { errors[id] = blockErrors[id]; });
  });
  return errors;
}

// Uma linha da planilha por campo. kind define o agregado no Consolidado.
function sheetLines() {
  var lines = [];
  QUESTIONS.forEach(function (block) {
    block.questions.forEach(function (question) {
      var prefix = question.n + '. ' + question.short;
      question.fields.forEach(function (field) {
        if (field.type === 'percentGroup' || field.type === 'rank') {
          field.options.forEach(function (option) {
            lines.push({
              block: block,
              n: question.n,
              fieldId: field.id,
              optionId: option.id,
              label: prefix + ': ' + option.label,
              kind: field.type === 'rank' ? 'rank' : 'percent',
              read: function (a) {
                var raw = a[field.id] && a[field.id][option.id];
                return field.type === 'rank' ? parseIntBR(raw) : parsePercentBR(raw);
              },
            });
          });
          return;
        }
        var label = field.label ? prefix + ': ' + field.label : prefix;
        lines.push({
          block: block,
          n: question.n,
          fieldId: field.id,
          optionId: null,
          label: label,
          kind: { money: 'money', int: 'int', score: 'avg', percent: 'percent', select: 'count', multi: 'count', longtext: 'text' }[field.type],
          read: function (a) { return readField(field, a); },
        });
      });
    });
  });
  return lines;
}

function readField(field, answers) {
  var value = answers[field.id];
  switch (field.type) {
    case 'money': return parseMoneyBR(value);
    case 'int':
    case 'score': return parseIntBR(value);
    case 'percent': return parsePercentBR(value);
    case 'multi': {
      var parts = (value || []).slice();
      var other = field.other ? otherText(answers, field) : '';
      if (other) parts.push('Outro: ' + other.replace(/;/g, ','));
      return sanitizeText(parts.join('; '));
    }
    default: return isBlank(value) ? '' : sanitizeText(value);
  }
}

function buildTabRows(answers, submittedAt) {
  var rows = [TAB_HEADER.slice()];
  sheetLines().forEach(function (line) {
    var value = line.read(answers);
    rows.push([line.label, value === null ? '' : value, submittedAt]);
  });
  return rows;
}

function parseSubmittedAt(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return isNaN(value.getTime()) ? null : value.toISOString();
  var m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(String(value).trim());
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5])).toISOString();
}

// Converte as abas em respostas por pergunta, como o Consolidado as lê.
function readAssessors(tabs) {
  return tabs.filter(function (tab) { return isAssessorTab(tab.rows); }).map(function (tab) {
    var answers = {};
    var latest = null;
    tab.rows.slice(1).forEach(function (row) {
      answers[row[0]] = row[1];
      var at = parseSubmittedAt(row[2]);
      if (at && (!latest || at > latest)) latest = at;
    });
    return { name: tab.name, submittedAt: latest, answers: answers };
  });
}

function isAssessorTab(rows) {
  return rows.length > 0 && rows[0][0] === TAB_HEADER[0] && rows[0][1] === TAB_HEADER[1];
}

function columnLetter(index) {
  var letters = '';
  for (var n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

function countOptions(cells) {
  var counts = {};
  var order = [];
  cells.forEach(function (cell) {
    if (isBlank(cell)) return;
    String(cell).split(';').forEach(function (part) {
      var key = part.trim();
      if (!key) return;
      if (!counts[key]) { counts[key] = 0; order.push(key); }
      counts[key]++;
    });
  });
  if (!order.length) return NOT_APPLICABLE;
  order.sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); });
  return order.map(function (key) { return key + ': ' + counts[key]; }).join('; ');
}

function buildConsolidado(tabs) {
  var assessors = tabs.filter(function (tab) { return isAssessorTab(tab.rows); });
  var answersByTab = assessors.map(function (tab) {
    var map = {};
    tab.rows.slice(1).forEach(function (row) { map[row[0]] = row[1]; });
    return map;
  });
  var header = ['Pergunta'].concat(assessors.map(function (tab) { return sanitizeText(tab.name); }), ['Total', 'Média']);
  var values = [header];
  var rowKinds = ['header'];
  var blank = function () { return header.map(function () { return ''; }); };
  var lastBlock = null;

  sheetLines().forEach(function (line) {
    if (line.block !== lastBlock) {
      lastBlock = line.block;
      var blockRow = blank();
      blockRow[0] = line.block.title;
      values.push(blockRow);
      rowKinds.push('block');
    }
    var cells = answersByTab.map(function (map) {
      var value = map[line.label];
      if (value === undefined || value === null) return '';
      return typeof value === 'string' ? sanitizeText(value) : value;
    });
    var rowNumber = values.length + 1;
    var range = assessors.length ? 'B' + rowNumber + ':' + columnLetter(assessors.length) + rowNumber : null;
    var total = NOT_APPLICABLE;
    var average = NOT_APPLICABLE;
    if (range && (line.kind === 'money' || line.kind === 'int')) total = '=SUM(' + range + ')';
    var hasNumber = cells.some(function (cell) { return typeof cell === 'number'; });
    if (hasNumber && ['money', 'int', 'percent', 'avg', 'rank'].indexOf(line.kind) !== -1) average = '=AVERAGE(' + range + ')';
    if (line.kind === 'count') total = countOptions(cells);
    values.push([line.label].concat(cells, [total, average]));
    rowKinds.push(line.kind);
  });
  return { values: values, rowKinds: rowKinds };
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseMoneyBR: parseMoneyBR,
    parsePercentBR: parsePercentBR,
    parseIntBR: parseIntBR,
    sumsTo100: sumsTo100,
    sumOfPercents: sumOfPercents,
    formatMoneyBR: formatMoneyBR,
    sanitizeText: sanitizeText,
    uniqueTabName: uniqueTabName,
    validateBlock: validateBlock,
    validateSubmission: validateSubmission,
    buildTabRows: buildTabRows,
    buildConsolidado: buildConsolidado,
    isAssessorTab: isAssessorTab,
    sheetLines: sheetLines,
    parseSubmittedAt: parseSubmittedAt,
    readAssessors: readAssessors,
    columnLetter: columnLetter,
    CONSOLIDADO: CONSOLIDADO,
  };
}
