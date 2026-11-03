const test = require('node:test');
const assert = require('node:assert');
const L = require('../shared/logic.js');
const P = require('../shared/painel-data.js');

const base = () => ({
  nome: 'x',
  q1: '25.000.000,00',
  q2_contas: '24',
  q2_ticket: '350.000,00',
  q3: { indicacoes: '40', prospeccao: '30', eventos: '30' },
  q4_meta: '150.000.000,00',
  q_perfil: 'Médicos',
  q5: '0,75',
  q6: { rf: '1', rv: '2', consorcios: '3', prev: '4', recorrente: '5', internacional: '6', pj: '7', credito: '8' },
  q7: { fee: '60', transacional: '40' },
  q8: ['Câmbio'],
  q8_volume: '1.000.000,00',
  q_regua: 'Sim',
  q_segmentacao: 'Por patrimônio',
  q_regua_nota: '8',
  q10: '3,5',
  q11: 'Rotina',
  q12: ['Ferramentas de CRM / automação de follow-up'],
  q12_outro: '',
  q13: ['CEA'],
  q14: '12',
  q15: 'Burocracia',
});
const tab = (name, patch, at = '30/10/2026 10:21') => ({ name, rows: L.buildTabRows(Object.assign(base(), patch), at) });
const tabs = () => [
  tab('Ana', { q12_outro: 'Treinamento' }),
  tab('Bruno', { q1: '10', q12_outro: 'Mentoria' }, '31/10/2026 09:00'),
  tab('Carla', { q1: '5.000.000,00', q5: '1', q_regua: 'Não', q6: { rf: '2', rv: '1', consorcios: '3', prev: '4', recorrente: '5', internacional: '6', pj: '7', credito: '8' } }),
];
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

test('sheetLines traz número da pergunta e ids', () => {
  const line = L.sheetLines().find((l) => l.fieldId === 'q3' && l.optionId === 'eventos');
  assert.equal(line.n, 3);
  assert.equal(L.sheetLines().find((l) => l.fieldId === 'q1').optionId, null);
});

test('parseSubmittedAt lê data e texto no padrão da planilha', () => {
  assert.equal(L.parseSubmittedAt('30/10/2026 10:21'), new Date(2026, 9, 30, 10, 21).toISOString());
  assert.equal(L.parseSubmittedAt(new Date(2026, 0, 2, 3, 4)), new Date(2026, 0, 2, 3, 4).toISOString());
  assert.equal(L.parseSubmittedAt('ontem'), null);
  assert.equal(L.parseSubmittedAt(''), null);
});

test('readAssessors ignora aba sem cabeçalho e usa a data mais recente', () => {
  const t = tab('Ana');
  t.rows[2][2] = '01/11/2026 08:00';
  const list = L.readAssessors([{ name: 'Rascunho', rows: [['a', 'b']] }, t]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Ana');
  assert.equal(list[0].submittedAt, new Date(2026, 10, 1, 8, 0).toISOString());
  assert.equal(list[0].answers['1. Captação Líquida 2027 (R$)'], 25000000);
});

test('summarize calcula os números do topo', () => {
  const s = P.summarize(L.readAssessors(tabs()));
  assert.equal(s.count, 3);
  assert.equal(s.lastSubmittedAt, new Date(2026, 9, 31, 9, 0).toISOString());
  assert.equal(s.kpis.captacao, 25000000 + 10 + 5000000);
  assert.equal(s.kpis.contas, 72);
  assert.equal(s.kpis.roa, avg([0.75, 0.75, 1]));
  assert.equal(s.kpis.auc, 450000000);
});

test('summarize monta séries por assessor e médias', () => {
  const s = P.summarize(L.readAssessors(tabs()));
  assert.deepEqual(s.byAssessor.captacao.map((x) => x.name), ['Ana', 'Bruno', 'Carla']);
  assert.deepEqual(s.byAssessor.nota.map((x) => x.value), [8, 8, 8]);
  assert.deepEqual(s.byAssessor.churn.map((x) => x.value), [3.5, 3.5, 3.5]);
  assert.deepEqual(s.stacked.origem.map((x) => x.label), ['Indicações da base atual (Member-get-Member)', 'Prospecção ativa própria (Outbound/Networking)', 'Eventos/Treinamentos']);
  assert.deepEqual(s.stacked.receita.map((x) => x.avg), [60, 40]);
  assert.equal(s.rank[0].label, 'Renda Fixa / Crédito Privado (CRI, CRA, Debêntures)');
  assert.equal(s.rank[0].avg, avg([1, 1, 2]));
  assert.equal(s.rank[s.rank.length - 1].label, 'Produtos de Crédito');
});

test('summarize conta opções, agrupando Outro', () => {
  const s = P.summarize(L.readAssessors(tabs()));
  assert.deepEqual(s.counts.regua, [{ label: 'Sim', count: 2 }, { label: 'Não', count: 1 }]);
  assert.deepEqual(s.counts.apoio.find((x) => x.label === 'Outro'), { label: 'Outro', count: 2 });
  assert.equal(s.counts.apoio.find((x) => x.label.startsWith('Ferramentas')).count, 3);
  assert.equal(s.counts.certificacoes.find((x) => x.label === 'CEA').count, 3);
  assert.equal(s.counts.certificacoes.find((x) => x.label === 'CFP®').count, 0);
  assert.equal(s.counts.crossSell[0].label, 'Câmbio');
});

test('summarize lista outros números e respostas abertas', () => {
  const s = P.summarize(L.readAssessors(tabs()));
  const reunioes = s.outros.find((o) => o.label.startsWith('17.'));
  assert.equal(reunioes.total, 36);
  assert.equal(reunioes.avg, 12);
  assert.equal(s.outros.find((o) => o.label.startsWith('2.')).total, null);
  assert.deepEqual(s.open.map((o) => o.title.split('.')[0]), ['5', '11', '14', '15', '18']);
  const outro = s.open.find((o) => o.title.startsWith('15.'));
  assert.deepEqual(outro.answers, [{ name: 'Ana', text: 'Treinamento' }, { name: 'Bruno', text: 'Mentoria' }]);
});

test('valor não numérico editado à mão é ignorado', () => {
  const t = tabs();
  t[0].rows.find((r) => r[0].startsWith('1. '))[1] = 'a confirmar';
  const s = P.summarize(L.readAssessors(t));
  assert.equal(s.kpis.captacao, 10 + 5000000);
  assert.deepEqual(s.byAssessor.captacao.map((x) => x.name), ['Bruno', 'Carla']);
});

test('sem respostas não gera números', () => {
  const s = P.summarize([]);
  assert.equal(s.count, 0);
  assert.equal(s.lastSubmittedAt, null);
  assert.deepEqual(s.kpis, { captacao: null, contas: null, roa: null, auc: null });
  assert.deepEqual(s.rank.map((r) => r.avg), new Array(8).fill(null));
});

test('assessorView compara o assessor com a equipe', () => {
  const list = L.readAssessors(tabs());
  const v = P.assessorView(list, 'Carla');
  assert.equal(v.own.count, 1);
  assert.equal(v.own.kpis.roa, 1);
  assert.equal(v.team.count, 3);
  assert.equal(P.assessorView(list, 'Inexistente'), null);
});
