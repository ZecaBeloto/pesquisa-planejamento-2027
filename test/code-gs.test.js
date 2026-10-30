// Roda apps-script/Code.gs contra um simulador mínimo das APIs do Google.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'apps-script/Shared.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');

function world(sheetCount = 0) {
  const log = [];
  const formats = [];
  const failNext = { insert: false, rebuild: false };
  const makeSheet = (name) => {
    const sheet = {
      name,
      maxCols: 26,
      rows: [],
      getName: () => sheet.name,
      getMaxColumns: () => sheet.maxCols,
      insertColumnsAfter: (_, n) => { sheet.maxCols += n; },
      getDataRange: () => ({ getValues: () => sheet.rows }),
      clear: () => { log.push('clear'); sheet.rows = []; },
      setFrozenRows: () => {},
      setFrozenColumns: () => {},
      setColumnWidth: () => {},
      getRange: (r, c, nr = 1, nc = 1) => {
        if (c + nc - 1 > sheet.maxCols) throw new Error('coordinates outside the dimensions');
        const range = new Proxy({}, {
          get: (_, prop) => {
            if (prop === 'setValues') return (values) => {
              if (failNext.write && name !== 'Consolidado') throw new Error('falha na gravação');
              sheet.rows = values;
              log.push(`write:${name}`);
              return range;
            };
            if (prop === 'setNumberFormat') return (f) => { formats.push({ sheet: name, r, c, nc, f }); return range; };
            return () => range;
          },
        });
        return range;
      },
    };
    return sheet;
  };
  const sheets = [makeSheet('Consolidado')];
  const header = ['Pergunta', 'Resposta', 'Enviado em'];
  for (let i = 0; i < sheetCount; i++) {
    const s = makeSheet(`A${i}`);
    s.rows = [header];
    sheets.unshift(s);
  }
  const ss = {
    getSheets: () => sheets.slice(),
    getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
    insertSheet: (n, at) => { const s = makeSheet(n); sheets.splice(at === undefined ? sheets.length : at, 0, s); return s; },
    deleteSheet: (s) => { sheets.splice(sheets.indexOf(s), 1); log.push(`delete:${s.name}`); },
    setActiveSheet: () => {},
    moveActiveSheet: () => {},
    getNumSheets: () => sheets.length,
  };
  const props = { SPREADSHEET_ID: 'x' };
  const context = {
    console: { error: () => {} },
    JSON, Math, Date, Object, Array, String, Number,
    SpreadsheetApp: { openById: () => ss, flush: () => log.push('flush') },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => log.push('lock'), tryLock: () => true, releaseLock: () => log.push('release') }) },
    Utilities: { formatDate: () => '30/10/2026 10:00' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }) },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, ss, sheets, log, formats, failNext };
}

const answers = (nome) => ({
  nome,
  q1: '10',
  q2_contas: '12',
  q2_ticket: '10',
  q3: { indicacoes: '100', prospeccao: '0', parcerias: '0', leads: '0' },
  q4_atual: '1',
  q4_meta: '2',
  q5: '1',
  q6: { rf: '1', rv: '2', fundos: '3', prev: '4', recorrente: '5' },
  q7: { fee: '100', transacional: '0' },
  q8: [],
  q9_nps: '80',
  q9_freq: 'Mensal',
  q10: '1',
  q11: 'x',
  q12: ['Ferramentas de CRM / automação de follow-up'],
  q13: ['CEA'],
  q14: '12',
  q15: 'x',
});
const post = (w, id, a) => w.context.doPost({ postData: { contents: JSON.stringify({ submissionId: id, answers: a }) } });

test('Consolidado comporta mais de 23 assessores', () => {
  const w = world(30);
  w.context.rebuildConsolidado();
  const consolidado = w.ss.getSheetByName('Consolidado');
  assert.equal(consolidado.rows[0].length, 33);
  assert.ok(consolidado.maxCols >= 33);
});

test('falha ao montar o Consolidado não apaga o conteúdo anterior', () => {
  const w = world(1);
  w.context.buildConsolidado = () => { throw new Error('falha'); };
  w.ss.getSheetByName('Consolidado').rows = [['anterior']];
  assert.throws(() => w.context.rebuildConsolidado());
  assert.deepEqual(w.ss.getSheetByName('Consolidado').rows, [['anterior']]);
});

test('gravações são confirmadas antes de liberar o bloqueio', () => {
  const w = world();
  assert.equal(post(w, 'a', answers('Ana')).ok, true);
  assert.ok(w.log.lastIndexOf('flush') > w.log.lastIndexOf('write:Consolidado'));
  assert.ok(w.log.lastIndexOf('flush') < w.log.lastIndexOf('release'));
});

test('o gatilho também confirma antes de liberar', () => {
  const w = world(1);
  w.context.onChangeHandler();
  assert.ok(w.log.lastIndexOf('flush') > w.log.lastIndexOf('write:Consolidado'));
  assert.ok(w.log.lastIndexOf('flush') < w.log.lastIndexOf('release'));
});

test('reenvio depois de falha no Consolidado o reconstrói', () => {
  const w = world();
  const original = w.context.rebuildConsolidado;
  w.context.rebuildConsolidado = () => { throw new Error('falha'); };
  assert.equal(post(w, 'a', answers('Ana')).ok, false);
  w.context.rebuildConsolidado = original;
  const again = post(w, 'a', answers('Ana'));
  assert.equal(again.ok, true);
  assert.equal(again.tab, 'Ana');
  assert.deepEqual(w.ss.getSheetByName('Consolidado').rows[0].slice(0, 2), ['Pergunta', 'Ana']);
  assert.equal(w.sheets.length, 2);
});

test('falha ao gravar a aba não deixa aba parcial', () => {
  const w = world();
  w.failNext.write = true;
  assert.equal(post(w, 'a', answers('Ana')).ok, false);
  assert.equal(w.ss.getSheetByName('Ana'), null);
  w.failNext.write = false;
  assert.equal(post(w, 'a', answers('Ana')).tab, 'Ana');
});

test('Média de inteiros mostra decimal, sem arredondar', () => {
  const w = world();
  post(w, 'a', answers('Ana'));
  post(w, 'b', answers('Bruno'));
  const c = w.ss.getSheetByName('Consolidado');
  const rowOf = c.rows.findIndex((r) => String(r[0]).startsWith('14. ')) + 1;
  const width = c.rows[0].length;
  const f = w.formats.filter((x) => x.sheet === 'Consolidado' && x.r === rowOf).slice(-2);
  assert.deepEqual(f.map((x) => [x.c, x.nc, x.f]), [[2, width - 2, '0'], [width, 1, '0.0']]);
});
