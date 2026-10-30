// Copia a lógica compartilhada para o Apps Script, que não tem módulos.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

fs.writeFileSync(path.join(root, 'apps-script/Shared.gs'), read('shared/questions.js') + '\n' + read('shared/logic.js'));
