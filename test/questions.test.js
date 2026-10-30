const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS, IDENTIFICATION } = require('../shared/questions.js');

test('são 4 blocos, com perguntas numeradas de 1 a 18', () => {
  assert.equal(QUESTIONS.length, 4);
  const numbers = QUESTIONS.flatMap((b) => b.questions.map((q) => q.n));
  assert.deepEqual(numbers, Array.from({ length: 18 }, (_, i) => i + 1));
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
    'Eventos/Treinamentos',
  ]);
  assert.equal(q(16).text, 'Planeja tirar ou renovar certificações em 2027?');
  assert.deepEqual(q(16).fields[0].options, ['CFP®', 'CGA / CGE', 'CEA', 'PQO / Ancord', 'Cursos de Estruturação Off-shore / Wealth', 'Nenhuma / Já certificado']);
  assert.equal(q(16).fields[0].exclusive, 'Nenhuma / Já certificado');
  assert.deepEqual(q(10).fields[0].options, ['Sim', 'Não']);
  assert.equal(q(10).text, 'Você possui uma régua de relacionamento definida, com frequência de contato estabelecida de acordo com o perfil e a relevância de cada cliente?');
  assert.equal(q(11).text, 'Explique como você segmenta sua carteira, quais critérios utiliza para classificar os clientes e qual a frequência de contato prevista para cada grupo.');
  assert.equal(q(12).text, 'Por fim, de 0 a 10, quanto você avalia que está cumprindo essa rotina de relacionamento atualmente?');
  assert.equal(q(12).fields[0].max, 10);
  assert.equal(q(5).text, 'Descreva o perfil de cliente que você considera ideal.');
  assert.deepEqual(q(7).fields[0].options.map((o) => o.label), [
    'Renda Fixa / Crédito Privado (CRI, CRA, Debêntures)',
    'Renda Variável e Derivativos (Ações, Opções, FIIs)',
    'Consórcios',
    'Previdência Privada e Seguros',
    'Produtos de Receita Recorrente / Carteiras Administradas / Fee Fixo',
    'Alocações internacionais e câmbio',
    'Produtos PJ',
    'Produtos de Crédito',
  ]);
  assert.deepEqual(q(4).fields.map((f) => f.id), ['q4_meta']);
});

test('ids de campo não se repetem', () => {
  const ids = [IDENTIFICATION, ...QUESTIONS].flatMap((b) => b.questions.flatMap((q) => q.fields.map((f) => f.id)));
  assert.equal(new Set(ids).size, ids.length);
});

test('a palavra "meta" não aparece em nenhum texto', () => {
  const visible = JSON.stringify([IDENTIFICATION, ...QUESTIONS], (key, value) => (key === 'id' ? undefined : value));
  assert.ok(!/\bmetas?\b/i.test(visible), String(visible.match(/.{30}\bmetas?\b.{30}/i)));
});
