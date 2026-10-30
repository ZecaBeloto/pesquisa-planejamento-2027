// Web App que recebe as respostas e mantém a planilha.
// Execute setup() uma vez no editor para criar a planilha e o gatilho.
var SPREADSHEET_NAME = 'Respostas | Planejamento 2027';
var TIME_ZONE = 'America/Sao_Paulo';
var NOTE = 'Gerado automaticamente. Corrija na aba do assessor: edições aqui são substituídas.';
var FORMATS = { money: '"R$" #,##0.00', int: '0', percent: '0.00"%"', avg: '0.0', rank: '0.0' };
var TAB_FORMATS = { money: '"R$" #,##0.00', int: '0', percent: '0.00"%"', avg: '0', rank: '0' };
var NAVY = '#06152C';
var GOLD = '#C8A84B';
var LIGHT = '#E8EEF6';

function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss;
  if (props.getProperty('SPREADSHEET_ID')) {
    ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  } else {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    ss.getSheets()[0].setName(CONSOLIDADO);
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onChangeHandler').forSpreadsheet(ss).onChange().create();
  rebuildConsolidado();
  Logger.log('Planilha: ' + ss.getUrl());
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var payload = JSON.parse(e.postData.contents);
    var answers = payload.answers;
    if (!answers || typeof answers !== 'object' || typeof payload.submissionId !== 'string' || !payload.submissionId) {
      return respond({ ok: false, errors: { _: 'Envio inválido.' } });
    }
    var errors = validateSubmission(answers);
    if (Object.keys(errors).length) return respond({ ok: false, errors: errors });

    lock.waitLock(30000);
    var props = PropertiesService.getScriptProperties();
    var key = 'sub_' + payload.submissionId.slice(0, 64);
    var previous = props.getProperty(key);
    if (previous) return respond({ ok: true, tab: previous });

    var ss = getSpreadsheet();
    var tabName = uniqueTabName(answers.nome, ss.getSheets().map(function (s) { return s.getName(); }));
    writeAssessorTab(ss, tabName, answers);
    props.setProperty(key, tabName);
    rebuildConsolidado();
    return respond({ ok: true, tab: tabName });
  } catch (err) {
    console.error(err);
    return respond({ ok: false, errors: { _: 'Não foi possível gravar a resposta. Tente novamente.' } });
  } finally {
    lock.releaseLock();
  }
}

function writeAssessorTab(ss, tabName, answers) {
  var submittedAt = Utilities.formatDate(new Date(), TIME_ZONE, 'dd/MM/yyyy HH:mm');
  var rows = buildTabRows(answers, submittedAt);
  var sheet = ss.insertSheet(tabName);
  sheet.getRange(1, 1, rows.length, 3).setValues(rows).setVerticalAlignment('top');
  sheetLines().forEach(function (line, i) {
    if (TAB_FORMATS[line.kind]) sheet.getRange(i + 2, 2).setNumberFormat(TAB_FORMATS[line.kind]).setHorizontalAlignment('left');
  });
  sheet.getRange(1, 1, 1, 3).setBackground(NAVY).setFontColor(GOLD).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 420);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 130);
  sheet.getRange(1, 1, rows.length, 2).setWrap(true);
}

function rebuildConsolidado() {
  var ss = getSpreadsheet();
  var target = ss.getSheetByName(CONSOLIDADO) || ss.insertSheet(CONSOLIDADO);
  var tabs = ss.getSheets()
    .filter(function (s) { return s.getName() !== CONSOLIDADO; })
    .map(function (s) { return { name: s.getName(), rows: s.getDataRange().getValues() }; });
  var built = buildConsolidado(tabs);
  var values = built.values;
  var width = values[0].length;

  target.clear();
  target.getRange(1, 1, values.length, width).setValues(values).setVerticalAlignment('top');
  built.rowKinds.forEach(function (kind, i) {
    var row = target.getRange(i + 1, 1, 1, width);
    if (kind === 'block') row.setBackground(LIGHT).setFontWeight('bold');
    if (FORMATS[kind] && width > 1) target.getRange(i + 1, 2, 1, width - 1).setNumberFormat(FORMATS[kind]);
  });
  target.getRange(1, 1, 1, width).setBackground(NAVY).setFontColor(GOLD).setFontWeight('bold').setNote(NOTE);
  target.getRange(2, width - 1, values.length - 1, 2).setFontWeight('bold');
  target.setFrozenRows(1);
  target.setFrozenColumns(1);
  target.setColumnWidth(1, 420);
  target.getRange(1, 1, values.length, width).setWrap(true);
  ss.setActiveSheet(target);
  ss.moveActiveSheet(ss.getNumSheets());
}

function onChangeHandler() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    rebuildConsolidado();
  } finally {
    lock.releaseLock();
  }
}
