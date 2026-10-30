# Pesquisa Planejamento 2027 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formulário em página própria no GitHub Pages que grava cada assessor em uma aba de planilha, com aba Consolidado no final e download em .xlsx.

**Architecture:** Página estática envia JSON por POST `text/plain` a um Web App do Apps Script ligado à planilha. A lógica de validação fica em um único arquivo JS sem dependências, usado pela página e copiado para o Apps Script. O Consolidado é sempre regenerado a partir das abas dos assessores.

**Tech Stack:** HTML, CSS e JavaScript sem framework nem build; Google Apps Script; `node --test` para a lógica pura (sem dependências npm).

**Spec:** `docs/superpowers/specs/2026-10-30-pesquisa-planejamento-2027-design.md`

## Global Constraints

- Visual: fundo `#06152C`, dourado `#C8A84B` a `#E2C97E`, fonte Poppins, logo extraído de `C:\Memorias\wiki\outputs\2026\apresentacao-mesa-rf-funcionalidades.html`.
- Textos das perguntas copiados da seção "Perguntas" da spec, em português.
- Consolidado é nome reservado e sempre a última aba.
- Nenhuma resposta é gravada no repositório. Nenhuma resposta é sobrescrita.
- Soma diferente de 100% nunca chega à planilha.
- Criar o repositório público e ativar o GitHub Pages exigem confirmação do gestor antes de executar.
- Repositório: `C:\Users\Public\pesquisa-planejamento-2027`, separado do CRM.

## Review Focus

- Percentuais quebrados como 33,33 + 33,33 + 33,34: devem somar exatamente 100, sem erro de ponto flutuante.
- Moeda digitada como `25.000.000,00`, `R$ 350.000,00`, `25000000` ou `350000,5`: todas viram o mesmo número correto, sem ler ponto de milhar como decimal.
- Nome com apóstrofo, espaços nas pontas, mais de 100 caracteres, "consolidado" em minúsculas ou repetido: gera aba válida, sem perder resposta.
- Valor corrigido à mão para texto, ou aba não relacionada criada pelo gestor: o Consolidado continua sendo gerado, sem quebrar para os demais assessores.
- Dois assessores enviando ao mesmo tempo, ou clique duplo em Enviar: duas respostas distintas gravadas e nenhuma duplicada pelo clique duplo.

---

### Task 1: Teste de envio sem login

Prova descartável do risco principal. Se falhar, parar e levar ao gestor.

**Files:**
- Create: `C:\Users\Public\pesquisa-planejamento-2027\.gitignore` (git init local, sem publicar; copiar spec e plano para `docs/superpowers/`)
- Temporary: projeto Apps Script `Teste envio` na conta do gestor

**Interfaces:**
- Produces: confirmação de que POST anônimo recebe resposta JSON legível.

- [ ] **Step 1: Criar Web App descartável pelo Chrome**

`doPost(e)` devolve `ContentService` JSON `{ok:true, echo:e.postData.contents}`. Implantar como "Executar como: eu" e "Acesso: qualquer pessoa". O gestor autoriza a tela de permissões.

- [ ] **Step 2: Verificar sem login**

Run: `curl -sL -H "Content-Type: text/plain" -d '{"t":1}' "<URL do Web App>"`
Expected: `{"ok":true,"echo":"{\"t\":1}"}`, sem página de login.

- [ ] **Step 3: Verificar a partir de outra origem**

De uma página aberta em `http://localhost`, `fetch` POST `text/plain` e `await r.json()`.
Expected: `ok:true` no console, sem erro de CORS.

- [ ] **Step 4: Remover a implantação de teste e registrar o resultado no plano**

### Task 2: Lógica compartilhada e definição das perguntas

**Files:**
- Create: `shared/logic.js`, `shared/questions.js`
- Test: `test/logic.test.js`, `test/questions.test.js`

**Interfaces:**
- Produces (scripts clássicos, globais no navegador e no Apps Script; `module.exports` só quando `module` existir):
  - `QUESTIONS`: lista de blocos `{id, title, fields:[{id, q, label, type, options?, required?, hint?}]}`. `type`: `name|money|int|percent|percentGroup|rank|multi|select|longtext`.
  - `parseMoneyBR(text) -> number|null`, `parsePercentBR(text) -> number|null`
  - `sumsTo100(values:number[]) -> boolean` (compara em centésimos inteiros)
  - `validateBlock(block, answers) -> {fieldId: mensagem}`
  - `validateSubmission(answers) -> {fieldId: mensagem}`
  - `sanitizeText(text) -> string`
  - `uniqueTabName(name, existingNames) -> string`
  - `buildTabRows(answers, submittedAt) -> any[][]` (pergunta, resposta, data/hora; uma linha por campo)
  - `buildConsolidado(tabs:[{name, rows}]) -> {values:any[][], rowKinds:string[]}` (`rowKinds`: `block|sum|avg|count|rank|text`)

- [ ] **Step 1: Escrever os testes que falham**

```js
assert.equal(parseMoneyBR('25.000.000,00'), 25000000);
assert.equal(parseMoneyBR('R$ 350.000,00'), 350000);
assert.equal(parseMoneyBR('25000000'), 25000000);
assert.equal(parseMoneyBR('350000,5'), 350000.5);
assert.equal(parseMoneyBR('abc'), null);
assert.equal(parsePercentBR('0,75%'), 0.75);
assert.ok(sumsTo100([33.33, 33.33, 33.34]));
assert.ok(!sumsTo100([40, 30, 20, 11]));
assert.equal(uniqueTabName('  Ana ', []), 'Ana');
assert.equal(uniqueTabName('Ana', ['Ana']), 'Ana (2)');
assert.equal(uniqueTabName('Ana', ['Ana', 'Ana (2)']), 'Ana (3)');
assert.equal(uniqueTabName('consolidado', ['Consolidado']), 'consolidado (assessor)');
assert.ok(uniqueTabName('x'.repeat(150), []).length <= 100);
assert.equal(sanitizeText('=SOMA(A1)'), "'=SOMA(A1)");
```

Também: `validateBlock` rejeita soma diferente de 100 nos grupos das perguntas 3 e 7, ranking com posição repetida, NPS acima de 100 e pergunta 8 com opção marcada sem volume; aceita pergunta 8 vazia. `validateSubmission` recusa "Nenhuma / Já certificado" junto de outra certificação e pergunta 12 sem opção. `questions.test.js`: 4 blocos, numeração 1 a 15 e os textos exatos das perguntas 3 e 13 da spec. `buildConsolidado`: linha de bloco, Total e Média corretos por tipo conforme a tabela da spec, percentuais sem Total, contagem `CFP®: 3; CEA: 1` e texto integral. Valor não numérico em uma aba não quebra as demais, e o agregado ignora esse valor.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `node --test test/`
Expected: FAIL, funções não definidas.

- [ ] **Step 3: Implementar `shared/questions.js` e `shared/logic.js`**

`buildConsolidado` localiza respostas pela coluna Pergunta de cada aba, não pela posição.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared test
git commit -m "feat: adiciona perguntas e regras de validação"
```

### Task 3: Gravação na planilha

**Files:**
- Create: `apps-script/Code.gs`, `apps-script/appsscript.json`, `scripts/sync-shared.js`
- Test: `test/sync.test.js`

**Interfaces:**
- Consumes: tudo de `shared/` da Task 2, copiado para `apps-script/Shared.gs` por `sync-shared.js`.
- Produces: resposta do Web App `{ok:true, tab:string}` ou `{ok:false, errors:{fieldId:mensagem}}`.
  - `doPost(e)`, `rebuildConsolidado()`, `onChangeHandler(e)`, `installTrigger()`

- [ ] **Step 1: Escrever o teste que falha**

`sync.test.js` confirma que `apps-script/Shared.gs` é igual a `shared/questions.js` + `shared/logic.js`.

- [ ] **Step 2: Implementar `sync-shared.js` e `Code.gs`**

`doPost`: `LockService.getScriptLock().waitLock(30000)`, `validateSubmission`, `uniqueTabName`, grava aba com números como número e formato de R$ ou %, regenera o Consolidado e o move para o final. Inválido não grava nada. `onChangeHandler` (gatilho instalável `onChange`) e o onEdit regeneram o Consolidado quando uma aba muda ou é apagada, ignorando edições na própria aba Consolidado. `submissionId` gerado no navegador evita duplicidade por reenvio: se já existir, devolve a aba já gravada. O Consolidado recebe uma nota: "Gerado automaticamente. Corrija na aba do assessor."

- [ ] **Step 3: Rodar**

Run: `node scripts/sync-shared.js && node --test test/`
Expected: PASS.

- [ ] **Step 4: Implantar na planilha nova pelo Chrome**

Criar a planilha "Respostas | Planejamento 2027", colar os arquivos, rodar `installTrigger`, implantar o Web App. O gestor autoriza as permissões.

- [ ] **Step 5: Verificar com envios reais**

Com `curl`, enviar "Ana", "Ana" de novo, "O'Brien" e um payload com soma 90.
Expected: abas `Ana`, `Ana (2)` e `O'Brien`; soma 90 devolve `ok:false` e não grava. Consolidado por último, com as três colunas.
Corrigir um valor na aba Ana e apagar `Ana (2)`.
Expected: Consolidado acompanha e a coluna some.
Enviar dois POSTs simultâneos com nomes diferentes.
Expected: ambos gravados.

- [ ] **Step 6: Commit**

```bash
git add apps-script scripts test
git commit -m "feat: grava respostas em abas e gera o Consolidado"
```

### Task 4: Página do formulário

**Files:**
- Create: `index.html`, `web/style.css`, `web/app.js`, `web/config.js`, `web/logo.*`, `web/lateral.*`
- Test: verificação no navegador

**Interfaces:**
- Consumes: `QUESTIONS`, `validateBlock`, `parseMoneyBR`, `parsePercentBR`, `sumsTo100` de `shared/`; contrato do Web App da Task 3.
- Produces: `web/config.js` com `WEB_APP_URL`.

- [ ] **Step 1: Extrair logo e imagem lateral do arquivo dos slides**

Decodificar os `data:` do HTML para arquivos. Expected: imagens abrem corretamente.

- [ ] **Step 2: Implementar a página conforme o modelo A**

Tela de nome, 4 blocos e confirmação; barra de progresso; Voltar e Avançar; erro junto ao campo; total em tempo real nos grupos de percentual; moeda formatada ao digitar; imagem lateral some abaixo de 768px. Ranking por seleção de posição de 1 a 5 em cada linha, que funciona em celular. Enviar fica desativado durante o envio; `submissionId` é mantido em nova tentativa após falha de rede, sem perder o preenchimento.

- [ ] **Step 3: Verificar no navegador, em desktop e 375px**

Preencher tudo com a URL real. Expected: soma 90 trava o Avançar com total visível; soma 100 libera; envio mostra a confirmação e cria a aba; sem rolagem horizontal; clique duplo em Enviar gera uma só aba; falha de rede simulada mantém os dados.

- [ ] **Step 4: Commit**

```bash
git add index.html web
git commit -m "feat: adiciona página do formulário"
```

### Task 5: Publicar e testar de ponta a ponta

**Files:**
- Create: `README.md` (como reimplantar, baixar o .xlsx e zerar respostas de teste)

**Interfaces:**
- Consumes: tudo acima.
- Produces: link final para os assessores.

- [ ] **Step 1: Confirmar com o gestor a criação do repositório público**

- [ ] **Step 2: Publicar**

Run: `gh repo create ZecaBeloto/pesquisa-planejamento-2027 --public --source=. --push`, depois ativar Pages na branch `main`.
Expected: URL `https://zecabeloto.github.io/pesquisa-planejamento-2027/` abre o formulário.

- [ ] **Step 3: Envio real pelo link publicado**

Expected: aba criada e Consolidado atualizado.

- [ ] **Step 4: Baixar o .xlsx e conferir**

Expected: abas preservadas, Consolidado por último, números numéricos e fórmulas de Total e Média corretas.

- [ ] **Step 5: Apagar as abas de teste**

Expected: planilha limpa, só com o Consolidado.

- [ ] **Step 6: Commit do README e entrega do link**
