const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS, IDENTIFICATION } = require('../shared/questions.js');

test('são 4 blocos, com perguntas numeradas de 1 a 15', () => {
  assert.equal(QUESTIONS.length, 4);
  const numbers = QUESTIONS.flatMap((b) => b.questions.map((q) => q.n));
  assert.deepEqual(numbers, Array.from({ length: 15 }, (_, i) => i + 1));
});

test('o nome é a identificação obrigatória', () => {
  assert.equal(IDENTIFICATION.questions[0].fields[0].id, 'nome');
  assert.equal(IDENTIFICATION.questions[0].fields[0].required, true);
});

test('textos fixados pela spec', () => {
  const all = QUESTIONS.flatMap((b) => b.questions);
  const q = (n) => all.find((x) => x.n === n);
  assert.equal(q(3).text, 'Qual percentual dos tipos de captação que pretende ter para ano que vem?');
  assert.deepEqual(q(3).fields[0].options.map((o) => o.label), [
    'Indicações da base atual (Member-get-Member)',
    'Prospecção ativa própria (Outbound/Networking)',
    'Parcerias B2B / M&A de carteiras',
    'Leads e eventos institucionais GR Capital',
  ]);
  assert.equal(q(13).text, 'Planeja tirar ou renovar certificações em 2027?');
  assert.deepEqual(q(13).fields[0].options, ['CFP®', 'CGA / CGE', 'CEA', 'PQO / Ancord', 'Cursos de Estruturação Off-shore / Wealth', 'Nenhuma / Já certificado']);
  assert.equal(q(13).fields[0].exclusive, 'Nenhuma / Já certificado');
  assert.deepEqual(q(9).fields[1].options, ['Mensal', 'Bimestral', 'Trimestral']);
  assert.equal(q(6).fields[0].options.length, 5);
});

test('ids de campo não se repetem', () => {
  const ids = [IDENTIFICATION, ...QUESTIONS].flatMap((b) => b.questions.flatMap((q) => q.fields.map((f) => f.id)));
  assert.equal(new Set(ids).size, ids.length);
});
