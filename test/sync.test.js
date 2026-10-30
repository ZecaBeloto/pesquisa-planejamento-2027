const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('apps-script/Shared.gs é a cópia exata de shared/', () => {
  assert.equal(read('apps-script/Shared.gs'), read('shared/questions.js') + '\n' + read('shared/logic.js'));
});
