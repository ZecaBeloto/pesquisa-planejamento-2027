// Números, séries e listas do painel. Sem dependências: roda no navegador e em Node.
if (typeof module !== 'undefined') {
  var _logic = require('./logic.js');
  var sheetLines = _logic.sheetLines;
  var formatMoneyBR = _logic.formatMoneyBR;
  var QUESTIONS = require('./questions.js').QUESTIONS;
}

var OTHER = 'Outro';
var UNKNOWN = 'Outros valores';

function normalize(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isNumber(value) {
  return typeof value === 'number' && isFinite(value);
}

function average(values) {
  return values.length ? values.reduce(function (a, b) { return a + b; }, 0) / values.length : null;
}

function findLines(fieldId) {
  return sheetLines().filter(function (line) { return line.fieldId === fieldId; });
}

function findLine(fieldId) {
  return findLines(fieldId)[0];
}

function findField(fieldId) {
  var found = null;
  QUESTIONS.forEach(function (block) {
    block.questions.forEach(function (question) {
      question.fields.forEach(function (field) { if (field.id === fieldId) found = field; });
    });
  });
  return found;
}

function numbersOf(assessors, line) {
  return assessors
    .map(function (a) { return { name: a.name, value: a.answers[line.label] }; })
    .filter(function (x) { return isNumber(x.value); });
}

function sumOf(assessors, fieldId) {
  var values = numbersOf(assessors, findLine(fieldId));
  return values.length ? values.reduce(function (s, x) { return s + x.value; }, 0) : null;
}

function averageOf(assessors, line) {
  return average(numbersOf(assessors, line).map(function (x) { return x.value; }));
}

function optionLabel(fieldId, optionId) {
  var option = findField(fieldId).options.filter(function (o) { return o.id === optionId; })[0];
  return option.label;
}

function countOf(assessors, fieldId) {
  var field = findField(fieldId);
  var line = findLine(fieldId);
  var counts = field.options.map(function (option) { return { label: option, count: 0, key: normalize(option) }; });
  var other = { label: OTHER, count: 0 };
  var unknown = { label: UNKNOWN, count: 0 };
  assessors.forEach(function (a) {
    var cell = a.answers[line.label];
    if (cell === undefined || cell === null || cell === '') return;
    var seenOther = false;
    String(cell).split(';').forEach(function (part) {
      var item = part.trim();
      if (!item) return;
      if (field.other && item.indexOf(OTHER + ':') === 0) {
        if (!seenOther) other.count++;
        seenOther = true;
        return;
      }
      // Valores corrigidos à mão com outra grafia ainda contam; os desconhecidos vão para "Outros valores".
      var match = counts.filter(function (c) { return c.key === normalize(item); })[0];
      if (match) match.count++;
      else unknown.count++;
    });
  });
  counts = counts.map(function (c) { return { label: c.label, count: c.count }; });
  if (field.other) counts.push(other);
  if (unknown.count) counts.push(unknown);
  return counts
    .map(function (c, i) { return { c: c, i: i }; })
    .sort(function (x, y) { return y.c.count - x.c.count || x.i - y.i; })
    .map(function (x) { return x.c; });
}

function openOf(assessors, fieldId) {
  var line = findLine(fieldId);
  return {
    title: line.label,
    answers: assessors
      .map(function (a) { return { name: a.name, text: String(a.answers[line.label] === undefined ? '' : a.answers[line.label]).trim() }; })
      .filter(function (x) { return x.text !== ''; }),
  };
}

function otherTextsOf(assessors, fieldId) {
  var line = findLine(fieldId);
  var answers = [];
  assessors.forEach(function (a) {
    String(a.answers[line.label] === undefined ? '' : a.answers[line.label]).split(';').forEach(function (part) {
      var item = part.trim();
      if (item.indexOf(OTHER + ':') === 0) answers.push({ name: a.name, text: item.slice(OTHER.length + 1).trim() });
    });
  });
  return { title: line.label + ': ' + OTHER, answers: answers };
}

function summarize(assessors) {
  var latest = null;
  assessors.forEach(function (a) { if (a.submittedAt && (!latest || a.submittedAt > latest)) latest = a.submittedAt; });
  var byName = function (fieldId) { return numbersOf(assessors, findLine(fieldId)); };
  var stacked = function (fieldId) {
    return findLines(fieldId).map(function (line) {
      return { label: optionLabel(fieldId, line.optionId), avg: averageOf(assessors, line) };
    });
  };
  var outro = function (fieldId, withTotal) {
    var line = findLine(fieldId);
    var values = numbersOf(assessors, line);
    return { label: line.label, values: values, total: withTotal ? sumOf(assessors, fieldId) : null, avg: averageOf(assessors, line) };
  };
  var open = ['q_perfil', 'q_segmentacao', 'q11'].map(function (id) { return openOf(assessors, id); });
  open.push(otherTextsOf(assessors, 'q12'));
  open.push(openOf(assessors, 'q15'));

  return {
    count: assessors.length,
    lastSubmittedAt: latest,
    kpis: {
      captacao: sumOf(assessors, 'q1'),
      contas: sumOf(assessors, 'q2_contas'),
      roa: averageOf(assessors, findLine('q5')),
      auc: sumOf(assessors, 'q4_meta'),
    },
    byAssessor: { captacao: byName('q1'), contas: byName('q2_contas'), auc: byName('q4_meta'), nota: byName('q_regua_nota'), churn: byName('q10') },
    stacked: { origem: stacked('q3'), receita: stacked('q7') },
    rank: stacked('q6')
      .map(function (x, i) { return { x: x, i: i }; })
      .sort(function (a, b) {
        if (a.x.avg === null || b.x.avg === null) return (a.x.avg === null) - (b.x.avg === null) || a.i - b.i;
        return a.x.avg - b.x.avg || a.i - b.i;
      })
      .map(function (y) { return y.x; }),
    counts: { crossSell: countOf(assessors, 'q8'), regua: countOf(assessors, 'q_regua'), apoio: countOf(assessors, 'q12'), certificacoes: countOf(assessors, 'q13') },
    outros: [outro('q2_ticket', false), outro('q8_volume', true), outro('q14', true)],
    open: open,
  };
}

var EMPTY = '–';

function formatAnswer(kind, value) {
  if (value === undefined || value === null || value === '') return EMPTY;
  if (typeof value !== 'number') return String(value);
  var plain = String(Number(value.toFixed(2))).replace('.', ',');
  if (kind === 'money') return 'R$ ' + formatMoneyBR(value);
  if (kind === 'percent') return plain + '%';
  if (kind === 'rank') return plain + 'º';
  return plain;
}

// Todas as respostas de um assessor, na ordem do formulário, para o PDF.
function answerRows(assessor) {
  var lines = sheetLines();
  var rows = [];
  QUESTIONS.forEach(function (block) {
    block.questions.forEach(function (question) {
      var items = lines.filter(function (line) { return line.n === question.n; }).map(function (line) {
        var field = findField(line.fieldId);
        var label = line.optionId ? optionLabel(line.fieldId, line.optionId) : (field.label || '');
        return { label: label, value: formatAnswer(line.kind, assessor.answers[line.label]) };
      });
      rows.push({ title: question.n + '. ' + question.text, items: items });
    });
  });
  return rows;
}

function pdfFileNames(names) {
  var taken = {};
  return names.map(function (name) {
    var base = String(name).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'assessor';
    var candidate = base;
    for (var i = 2; taken[candidate.toLowerCase()]; i++) candidate = base + ' (' + i + ')';
    taken[candidate.toLowerCase()] = true;
    return 'Planejamento2027_' + candidate + '.pdf';
  });
}

function assessorView(assessors, name) {
  var own = assessors.filter(function (a) { return a.name === name; });
  if (!own.length) return null;
  return { own: summarize(own), team: summarize(assessors) };
}

if (typeof module !== 'undefined') module.exports = { summarize: summarize, assessorView: assessorView, answerRows: answerRows, pdfFileNames: pdfFileNames };
