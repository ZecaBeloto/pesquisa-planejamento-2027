const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS } = require('../shared/questions.js');
const L = require('../shared/logic.js');

const validAnswers = () => ({
  nome: 'Ana',
  q1: '25.000.000,00',
  q2_contas: '24',
  q2_ticket: 'R$ 350.000,00',
  q3: { indicacoes: '40', prospeccao: '30', parcerias: '20', leads: '10' },
  q4_atual: '100000000',
  q4_meta: '150.000.000,00',
  q5: '0,75',
  q6: { rf: '1', rv: '2', fundos: '3', prev: '4', recorrente: '5' },
  q7: { fee: '60', transacional: '40' },
  q8: [],
  q8_volume: '',
  q9_nps: '80',
  q9_freq: 'Mensal',
  q10: '3,5',
  q11: 'Rotina de indicação',
  q12: ['Ferramentas de CRM / automação de follow-up'],
  q12_outro: '',
  q13: ['CEA'],
  q14: '12',
  q15: 'Burocracia',
});
const blockOf = (id) => QUESTIONS.find((b) => b.id === id);

test('parseMoneyBR entende o padrão brasileiro', () => {
  assert.equal(L.parseMoneyBR('25.000.000,00'), 25000000);
  assert.equal(L.parseMoneyBR('R$ 350.000,00'), 350000);
  assert.equal(L.parseMoneyBR('25000000'), 25000000);
  assert.equal(L.parseMoneyBR('350000,5'), 350000.5);
  assert.equal(L.parseMoneyBR('1.500'), 1500);
  assert.equal(L.parseMoneyBR('abc'), null);
  assert.equal(L.parseMoneyBR(''), null);
  assert.equal(L.parseMoneyBR('-5'), null);
});

test('ponto ambíguo em moeda é recusado, não lido como decimal', () => {
  assert.equal(L.parseMoneyBR('1000.000'), null);
  assert.equal(L.parseMoneyBR('25.000000'), null);
  assert.equal(L.parseMoneyBR('0.500'), null);
  assert.equal(L.parseMoneyBR('350000.5'), 350000.5);
  assert.equal(L.parseMoneyBR('1000.50'), 1000.5);
});

test('grupo de percentual recusa mais de duas casas decimais', () => {
  const a = validAnswers();
  a.q7 = { fee: '50,004', transacional: '50,004' };
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q7);
  a.q7 = { fee: '33,333', transacional: '66,667' };
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q7);
});

test('pergunta 8: volume sem opção marcada é recusado', () => {
  const a = validAnswers();
  a.q8_volume = '5.000.000,00';
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q8_volume);
});

test('campo Outro tem limite de tamanho', () => {
  const a = validAnswers();
  a.q12_outro = 'x'.repeat(5001);
  assert.ok(L.validateSubmission(a).q12);
});

test('parsePercentBR aceita vírgula, ponto e sufixos', () => {
  assert.equal(L.parsePercentBR('0,75%'), 0.75);
  assert.equal(L.parsePercentBR('0.75'), 0.75);
  assert.equal(L.parsePercentBR('3,5% a.a.'), 3.5);
  assert.equal(L.parsePercentBR('abc'), null);
});

test('formatMoneyBR formata no padrão brasileiro', () => {
  assert.equal(L.formatMoneyBR(25000000), '25.000.000,00');
  assert.equal(L.formatMoneyBR(350000.5), '350.000,50');
  assert.equal(L.formatMoneyBR(0), '0,00');
});

test('sumOfPercents ignora vazios e arredonda em centésimos', () => {
  assert.equal(L.sumOfPercents(['33,33', '33,33', '33,34', '']), 100);
  assert.equal(L.sumOfPercents(['abc', '10']), 10);
  assert.equal(L.sumOfPercents(['0,1', '0,2']), 0.3);
});

test('sumsTo100 não sofre com ponto flutuante', () => {
  assert.ok(L.sumsTo100([33.33, 33.33, 33.34]));
  assert.ok(L.sumsTo100([0.1, 0.2, 99.7]));
  assert.ok(!L.sumsTo100([40, 30, 20, 11]));
  assert.ok(!L.sumsTo100([40, 30, 20, 9.99]));
});

test('uniqueTabName gera nomes válidos e sem colisão', () => {
  assert.equal(L.uniqueTabName('  Ana ', []), 'Ana');
  assert.equal(L.uniqueTabName('Ana', ['Ana']), 'Ana (2)');
  assert.equal(L.uniqueTabName('Ana', ['Ana', 'Ana (2)']), 'Ana (3)');
  assert.equal(L.uniqueTabName('ana', ['Ana']), 'ana (2)');
  assert.equal(L.uniqueTabName('consolidado', ['Consolidado']), 'consolidado (assessor)');
  assert.equal(L.uniqueTabName("O'Brien", []), "O'Brien");
  assert.ok(L.uniqueTabName('x'.repeat(150), []).length <= 100);
  const longo = 'x'.repeat(150);
  const primeiro = L.uniqueTabName(longo, []);
  const segundo = L.uniqueTabName(longo, [primeiro]);
  assert.notEqual(primeiro, segundo);
  assert.ok(segundo.length <= 100);
});

test('sanitizeText neutraliza fórmulas', () => {
  assert.equal(L.sanitizeText('=SOMA(A1)'), "'=SOMA(A1)");
  assert.equal(L.sanitizeText('+1'), "'+1");
  assert.equal(L.sanitizeText('-1'), "'-1");
  assert.equal(L.sanitizeText('@x'), "'@x");
  assert.equal(L.sanitizeText('  =x'), "'=x");
  assert.equal(L.sanitizeText('normal'), 'normal');
});

test('validateSubmission aceita respostas válidas', () => {
  assert.deepEqual(L.validateSubmission(validAnswers()), {});
});

test('nome é obrigatório', () => {
  const a = validAnswers();
  a.nome = '   ';
  assert.ok(L.validateSubmission(a).nome);
});

test('pergunta 3 exige soma de 100', () => {
  const a = validAnswers();
  a.q3.leads = '0';
  assert.ok(L.validateBlock(blockOf('metas'), a).q3);
});

test('pergunta 7 exige soma de 100', () => {
  const a = validAnswers();
  a.q7.fee = '50';
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q7);
});

test('grupo de percentual aceita valores quebrados', () => {
  const a = validAnswers();
  a.q3 = { indicacoes: '33,33', prospeccao: '33,33', parcerias: '33,34', leads: '0' };
  assert.equal(L.validateBlock(blockOf('metas'), a).q3, undefined);
});

test('ranking não aceita posição repetida nem faltando', () => {
  const a = validAnswers();
  a.q6.rv = '1';
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q6);
  a.q6.rv = '';
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q6);
});

test('NPS fica entre 0 e 100', () => {
  const a = validAnswers();
  a.q9_nps = '101';
  assert.ok(L.validateBlock(blockOf('qualidade'), a).q9_nps);
  a.q9_nps = '100';
  assert.equal(L.validateBlock(blockOf('qualidade'), a).q9_nps, undefined);
});

test('pergunta 8: vazia é aceita, mas opção marcada exige volume', () => {
  const a = validAnswers();
  assert.equal(L.validateBlock(blockOf('rentabilidade'), a).q8_volume, undefined);
  a.q8 = ['Câmbio'];
  assert.ok(L.validateBlock(blockOf('rentabilidade'), a).q8_volume);
  a.q8_volume = '1.000.000,00';
  assert.equal(L.validateBlock(blockOf('rentabilidade'), a).q8_volume, undefined);
});

test('pergunta 12 exige ao menos uma opção ou Outro', () => {
  const a = validAnswers();
  a.q12 = [];
  assert.ok(L.validateSubmission(a).q12);
  a.q12_outro = 'Treinamento';
  assert.equal(L.validateSubmission(a).q12, undefined);
});

test('pergunta 13: Nenhuma não combina com outras', () => {
  const a = validAnswers();
  a.q13 = ['Nenhuma / Já certificado', 'CEA'];
  assert.ok(L.validateSubmission(a).q13);
  a.q13 = ['Nenhuma / Já certificado'];
  assert.equal(L.validateSubmission(a).q13, undefined);
});

test('opção fora da lista é recusada', () => {
  const a = validAnswers();
  a.q9_freq = 'Semanal';
  assert.ok(L.validateSubmission(a).q9_freq);
  const b = validAnswers();
  b.q13 = ['Inventada'];
  assert.ok(L.validateSubmission(b).q13);
});

test('campos com tipo errado não derrubam a validação', () => {
  assert.ok(L.validateSubmission({}).nome);
  const a = validAnswers();
  a.q3 = 'x';
  a.q13 = 'CEA';
  a.q1 = 5;
  const errors = L.validateSubmission(a);
  assert.ok(errors.q3 && errors.q13 && errors.q1);
});

test('buildTabRows grava números como número e separa campos', () => {
  const rows = L.buildTabRows(validAnswers(), '30/10/2026 10:00');
  assert.deepEqual(rows[0], ['Pergunta', 'Resposta', 'Enviado em']);
  const get = (prefix) => rows.find((r) => String(r[0]).startsWith(prefix))[1];
  assert.strictEqual(get('1. '), 25000000);
  assert.strictEqual(get('2. Abertura de contas: Meta de contas'), 24);
  assert.strictEqual(get('2. Abertura de contas: Ticket médio'), 350000);
  assert.strictEqual(get('3. Origem da captação: Indicações'), 40);
  assert.strictEqual(get('5. '), 0.75);
  assert.strictEqual(get('6. Prioridade de alocação: Renda Fixa'), 1);
  assert.equal(get('13. '), 'CEA');
  assert.equal(rows[1][2], '30/10/2026 10:00');
});

test('buildTabRows neutraliza fórmula em texto aberto', () => {
  const a = validAnswers();
  a.q15 = '=HYPERLINK("x")';
  const rows = L.buildTabRows(a, 'd');
  assert.equal(rows.find((r) => r[0].startsWith('15. '))[1], '\'=HYPERLINK("x")');
});

test('Outro com ponto e vírgula não quebra a contagem', () => {
  const a = validAnswers();
  a.q12_outro = 'a; b';
  const rows = L.buildTabRows(a, 'd');
  const row = rows.find((r) => r[0].startsWith('12. '));
  assert.equal(row[1], 'Ferramentas de CRM / automação de follow-up; Outro: a, b');
});

const tab = (name, patch) => ({ name, rows: L.buildTabRows(Object.assign(validAnswers(), patch), 'd') });

test('buildConsolidado monta o modelo A', () => {
  const { values, rowKinds } = L.buildConsolidado([tab('Ana'), tab('Bruno', { q1: '10', q13: ['CEA', 'CFP®'], q9_freq: 'Mensal' })]);
  assert.deepEqual(values[0], ['Pergunta', 'Ana', 'Bruno', 'Total', 'Média']);
  assert.equal(rowKinds[1], 'block');
  assert.ok(String(values[1][0]).startsWith('Bloco 1'));

  const row = (prefix) => values.find((r) => String(r[0]).startsWith(prefix));
  const r1 = row('1. ');
  assert.deepEqual(r1.slice(1, 3), [25000000, 10]);
  const n = values.indexOf(r1) + 1;
  assert.equal(r1[3], `=SUM(B${n}:C${n})`);
  assert.equal(r1[4], `=AVERAGE(B${n}:C${n})`);

  const roa = row('5. ');
  assert.equal(roa[3], '–');
  assert.ok(String(roa[4]).startsWith('=AVERAGE('));

  const rank = row('6. Prioridade de alocação: Renda Fixa');
  assert.equal(rank[3], '–');
  assert.ok(String(rank[4]).startsWith('=AVERAGE('));

  const cert = row('13. ');
  assert.equal(cert[3], 'CEA: 2; CFP®: 1');
  assert.equal(cert[4], '–');

  assert.equal(row('9. Meta de NPS e régua: Frequência')[3], 'Mensal: 2');

  const gargalo = row('15. ');
  assert.deepEqual(gargalo.slice(1), ['Burocracia', 'Burocracia', '–', '–']);
});

test('buildConsolidado localiza respostas pelo texto, não pela posição', () => {
  const t = tab('Ana');
  t.rows = [t.rows[0], ...t.rows.slice(1).reverse()];
  const { values } = L.buildConsolidado([t]);
  assert.strictEqual(values.find((r) => r[0].startsWith('1. '))[1], 25000000);
});

test('valor corrigido para texto não quebra as demais colunas', () => {
  const t = tab('Ana');
  t.rows.find((r) => r[0].startsWith('1. '))[1] = 'a confirmar';
  const { values } = L.buildConsolidado([t, tab('Bruno')]);
  assert.deepEqual(values.find((r) => r[0].startsWith('1. ')).slice(1, 3), ['a confirmar', 25000000]);
});

test('fórmulas não usam vírgula, que quebra em planilha pt-BR', () => {
  const { values } = L.buildConsolidado([tab('Ana'), tab('Bruno')]);
  values.flat().filter((v) => String(v).startsWith('=')).forEach((f) => assert.ok(!f.includes(','), f));
});

test('linha sem nenhum número não gera média com erro', () => {
  const { values } = L.buildConsolidado([tab('Ana'), tab('Bruno')]);
  const volume = values.find((r) => r[0].startsWith('8. Cross-sell PJ: Volume'));
  assert.deepEqual(volume.slice(1), ['', '', '=SUM(B' + (values.indexOf(volume) + 1) + ':C' + (values.indexOf(volume) + 1) + ')', '–']);
});

test('aba não relacionada é ignorada', () => {
  const { values } = L.buildConsolidado([{ name: 'Rascunho', rows: [['qualquer', 'coisa']] }, { name: 'Vazia', rows: [] }, tab('Ana')]);
  assert.deepEqual(values[0], ['Pergunta', 'Ana', 'Total', 'Média']);
});

test('sem assessores não gera fórmula inválida', () => {
  const { values } = L.buildConsolidado([]);
  assert.deepEqual(values[0], ['Pergunta', 'Total', 'Média']);
  assert.ok(values.every((r) => !String(r[1]).startsWith('=')));
});

test('texto vindo de aba editada é neutralizado no Consolidado', () => {
  const t = tab('Ana');
  t.rows.find((r) => r[0].startsWith('15. '))[1] = '=1+1';
  const { values } = L.buildConsolidado([t]);
  assert.equal(values.find((r) => r[0].startsWith('15. '))[1], "'=1+1");
});

test('nome de assessor com fórmula é neutralizado no cabeçalho', () => {
  const { values } = L.buildConsolidado([tab('=Ana')]);
  assert.equal(values[0][1], "'=Ana");
});
