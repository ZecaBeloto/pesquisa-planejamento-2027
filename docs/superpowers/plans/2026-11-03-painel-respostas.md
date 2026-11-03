# Painel de Respostas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel protegido por senha em `/painel/` que mostra as respostas da planilha, consolidadas em gráficos e por assessor, atualizando a cada 60 segundos.

**Architecture:** O Web App existente ganha a ação `painel`, que confere a senha e devolve as abas dos assessores já convertidas em objetos. Um módulo puro (`shared/painel-data.js`) calcula números, séries e listas; a página `painel/` apenas desenha com Chart.js.

**Tech Stack:** HTML/CSS/JS sem build, Chart.js 4.4.1 (cdnjs), Google Apps Script, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-03-painel-respostas-design.md`

## Global Constraints

- Senha só no corpo do POST, nunca na URL; nenhum dado sai sem `PAINEL_SENHA` válida (mínimo 12 caracteres).
- O envio do formulário (POST sem `action`) não muda; a suíte existente continua verde.
- Fonte dos dados: abas dos assessores (`isAssessorTab`), lidas pelo texto da coluna Pergunta.
- Visual: `#06152C`, `#C8A84B`/`#E2C97E`, Poppins, `web/logo.png`.
- Chart.js: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js`.
- Texto vindo da planilha entra na página só por `textContent` ou rótulos do Chart.js, nunca por `innerHTML`.
- Teste: `node --test "test/*.test.js"`.

## Review Focus

- Aba corrigida à mão com texto em campo numérico ou data em formato livre: painel ignora o valor, sem `NaN` nem quebra.
- Nome de assessor com `<`, `&` ou aspas: aparece literalmente, sem virar HTML.
- 30 ou mais assessores: gráficos por assessor continuam legíveis (altura cresce com a quantidade).
- Senha alterada no Apps Script com outra salva no navegador: volta para a tela de senha, sem loop de tentativas.
- Rede caindo durante a atualização automática: dados anteriores permanecem, com o horário da última atualização bem-sucedida.

---

### Task 1: Cálculos do painel

**Files:**
- Create: `shared/painel-data.js`
- Modify: `shared/logic.js` (metadados em `sheetLines`, `readAssessors`, `parseSubmittedAt`, exports)
- Test: `test/painel-data.test.js`

**Interfaces:**
- Produces:
  - `sheetLines()` passa a incluir `n`, `fieldId` e `optionId` (ou `null`) em cada linha; exportada.
  - `parseSubmittedAt(value: Date|string) -> string|null` (ISO; aceita `Date` e `dd/MM/yyyy HH:mm`).
  - `readAssessors(tabs: [{name, rows}]) -> [{name, submittedAt: string|null, answers: {label: value}}]` (só abas de assessor; `submittedAt` = maior data válida da coluna C).
  - `summarize(assessors) -> Summary`:
    - `count`, `lastSubmittedAt`
    - `kpis: {captacao, contas, roa, auc}` (somas; `roa` é média; `null` sem números)
    - `byAssessor: {captacao, auc, nota, churn}`: `[{name, value}]`, sem valores não numéricos
    - `stacked: {origem, receita}`: `[{label, avg}]` na ordem das opções
    - `rank`: `[{label, avg}]`, menor posição média primeiro
    - `counts: {crossSell, regua, apoio, certificacoes}`: `[{label, count}]`, maior primeiro; itens `Outro: …` contam como `Outro`
    - `outros`: `[{label, values: [{name, value}], total: number|null, avg: number|null}]` para ticket médio (2), volume PJ (9) e reuniões (17); `total` só para R$ e quantidades
    - `open`: `[{title, answers: [{name, text}]}]` para 5, 11, 14, 18 e "15. Apoio da mesa: Outro"
  - `assessorView(assessors, name) -> {own: Summary, team: Summary}|null`

- [ ] **Step 1: Escrever os testes**

Fixture com `buildTabRows` de 3 assessores. Asserções:
```js
assert.equal(s.count, 3);
assert.equal(s.kpis.captacao, 25000000 + 10 + 5000000);
assert.equal(s.kpis.roa, avg([0.75, 0.75, 1]));
assert.deepEqual(s.byAssessor.captacao.map((x) => x.name), ['Ana', 'Bruno', 'Carla']);
assert.deepEqual(s.stacked.origem.map((x) => x.label), ['Indicações da base atual (Member-get-Member)', 'Prospecção ativa própria (Outbound/Networking)', 'Eventos/Treinamentos']);
assert.equal(s.rank[0].label, 'Renda Fixa / Crédito Privado (CRI, CRA, Debêntures)');
assert.deepEqual(s.counts.apoio.find((x) => x.label === 'Outro'), { label: 'Outro', count: 2 });
assert.deepEqual(s.counts.regua, [{ label: 'Sim', count: 2 }, { label: 'Não', count: 1 }]);
assert.equal(s.outros.find((o) => o.label.startsWith('17.')).total, 36);
assert.ok(s.open.find((o) => o.title.startsWith('15.')).answers.some((a) => a.text === 'Treinamento'));
```
Também: texto em campo numérico é ignorado na soma e em `byAssessor`; `summarize([])` devolve `count: 0` e KPIs `null`; `readAssessors` ignora aba sem cabeçalho e usa a maior data; `parseSubmittedAt('30/10/2026 10:21')` devolve o ISO de 10:21 local; `parseSubmittedAt('ontem')` devolve `null`; `assessorView(x, 'Inexistente')` devolve `null`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test "test/*.test.js"`. Expected: FAIL nos testes novos e os demais verdes.

- [ ] **Step 3: Implementar** os itens de Produces. `painel-data.js` é script clássico, como `logic.js`, com `module.exports` condicional.

- [ ] **Step 4: Rodar.** Expected: tudo PASS.

- [ ] **Step 5: Commit** `feat: cálculos do painel`.

### Task 2: Leitura protegida no Web App

**Files:**
- Modify: `apps-script/Code.gs`, `scripts/sync-shared.js` (incluir `shared/painel-data.js` não é necessário no servidor; só `logic.js` muda)
- Test: `test/code-gs.test.js`

**Interfaces:**
- Consumes: `readAssessors` (Task 1).
- Produces: `doPost` com `{action: 'painel', senha}` → `{ok: true, assessors}` ou `{ok: false, error: 'senha'}`. Datas como string ISO.

- [ ] **Step 1: Testes no simulador.** Senha certa devolve as abas de assessor; senha errada devolve `error: 'senha'` e chama `Utilities.sleep(1000)`; `PAINEL_SENHA` ausente ou com menos de 12 caracteres recusa sempre; senha na query string (`e.parameter.senha`) é ignorada; envio do formulário sem `action` continua gravando aba.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** o ramo `painel` antes da validação do formulário, sem pegar o bloqueio de escrita.
- [ ] **Step 4: Rodar.** Expected: PASS.
- [ ] **Step 5: Reimplantar** pelo Chrome (colar `Shared.gs` + `Code.gs`, Nova versão). Verificar com `curl` que senha errada devolve `{"ok":false,"error":"senha"}`.
- [ ] **Step 6: Commit** `feat: leitura protegida para o painel`.
- [ ] **Step 7: Pedir ao gestor** que cadastre `PAINEL_SENHA` em Configurações do projeto > Propriedades do script.

### Task 3: Página do painel

**Files:**
- Create: `painel/index.html`, `painel/painel.css`, `painel/painel.js`
- Test: verificação no navegador com `fetch` simulado

**Interfaces:**
- Consumes: `summarize`, `assessorView` (Task 1); contrato da Task 2; `WEB_APP_URL` de `web/config.js`.

- [ ] **Step 1: Implementar** tela de senha (`localStorage` chave `painelSenha`, botão Sair), seletor Consolidado/assessores, números do topo, grade de gráficos conforme a spec, cartão Outros números, respostas abertas, comparação com a média da equipe na visão do assessor, estado "ainda não há respostas", atualização a cada 60 s só com a aba visível e ao voltar a ela, botão Atualizar, erro de rede mantendo dados, grade em uma coluna abaixo de 768 px. A altura dos gráficos por assessor cresce com a quantidade.
- [ ] **Step 2: Verificar no navegador**, servindo localmente e trocando `window.fetch` por respostas montadas com `buildTabRows`: 0, 3 e 30 assessores; nome `<b>&"x</b>` aparece literal; resposta `error: 'senha'` volta à tela de senha uma única vez; falha de rede mantém os dados; largura 375 px sem rolagem horizontal; seletor troca para um assessor e volta.
- [ ] **Step 3: Commit** `feat: página do painel`.

### Task 4: Publicar e verificar

- [ ] **Step 1:** `git push` e aguardar o GitHub Pages servir `painel/painel.js`.
- [ ] **Step 2:** Abrir `/painel/` publicado: senha errada é recusada (sem dados no tráfego de rede).
- [ ] **Step 3:** O gestor entra com a senha real e confirma os números contra a aba Consolidado.
- [ ] **Step 4:** Atualizar `README.md` com o uso do painel e a troca de senha; commit e push.
