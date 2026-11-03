# Pesquisa Planejamento 2027

Formulário dos assessores da GR Capital. A página fica no GitHub Pages e grava as respostas em uma planilha do Google, por meio de um Web App do Apps Script. Nenhuma resposta fica neste repositório.

## Baixar em Excel

Na planilha "Respostas | Planejamento 2027": **Arquivo > Fazer download > Microsoft Excel (.xlsx)**.

## Corrigir respostas

- Corrija sempre na aba do assessor; o Consolidado se atualiza sozinho e edições feitas nele são substituídas.
- Em percentuais, digite só o número (`40`, não `40%`).
- Resposta duplicada vira uma aba "Nome (2)". Apague a aba que não vale.

## Alterar perguntas ou regras

1. Edite `shared/questions.js` ou `shared/logic.js`.
2. Rode `node scripts/sync-shared.js` e `node --test "test/*.test.js"`.
3. Cole `apps-script/Shared.gs` e `apps-script/Code.gs` no projeto do Apps Script.
4. Em **Implantar > Gerenciar implantações**, edite a implantação e escolha **Nova versão**. A URL não muda.
5. Publique a página (`git push`).

## Instalar do zero

1. Crie um projeto em script.google.com com os arquivos de `apps-script/`.
2. Execute `setup` uma vez e autorize. O log mostra o link da planilha.
3. Implante como App da Web: executar como você, acesso "Qualquer pessoa".
4. Coloque a URL em `web/config.js`.

## Painel de respostas

Endereço: `https://zecabeloto.github.io/pesquisa-planejamento-2027/painel/`. Os dados só saem da planilha com a senha.

- **Cadastrar ou trocar a senha:** no Apps Script, abra **Configurações do projeto > Propriedades do script** e crie ou edite `PAINEL_SENHA`, com no mínimo 12 caracteres. Não precisa reimplantar.
- **Sair:** o navegador lembra a senha até você clicar em **Sair**. Ao trocar a senha, o painel volta para a tela de entrada.
- O painel lê as abas dos assessores e se atualiza a cada 60 segundos.
