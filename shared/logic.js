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
