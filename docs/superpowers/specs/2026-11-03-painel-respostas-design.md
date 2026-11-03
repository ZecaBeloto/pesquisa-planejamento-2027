# Painel de respostas: desenho

## Intenção

O gestor quer acompanhar em tempo quase real as respostas da pesquisa Planejamento 2027 sem abrir a planilha: uma visão consolidada da equipe, em gráficos, e uma visão de cada assessor. Por enquanto só o gestor usa o painel, inclusive para mostrar ao seu superior.

## Objetivos

- Painel no mesmo site do formulário: `https://zecabeloto.github.io/pesquisa-planejamento-2027/painel/`.
- Acesso só com senha, conferida no servidor (Apps Script): sem a senha, nenhum dado sai da planilha.
- Lista no topo para alternar entre "Consolidado" e cada assessor.
- Dados atualizados sozinhos a cada 60 segundos, com botão "Atualizar".
- Mesma identidade visual do formulário (`web/style.css`: `#06152C`, `#C8A84B`, Poppins, logo).

## Fora do escopo

- Acesso dos assessores, exportar PDF, filtros por período, edição de respostas pelo painel.

## O que faria isto ser um fracasso

- Respostas visíveis a quem não tem a senha, inclusive por quem ler o código público da página.
- Números do painel diferentes da planilha, especialmente depois que o gestor corrige uma aba à mão.
- Painel quebrar porque uma aba foi editada à mão (texto em campo numérico, aba não relacionada).
- O formulário dos assessores deixar de funcionar por causa do painel.

## Decisões do gestor

- **Usuário:** só o gestor.
- **Layout do Consolidado:** modelo A, painel resumido: números principais no topo e grade de gráficos; respostas abertas listadas no final, com o nome do assessor.
- **Conteúdo** (proposto e aceito):
  - **Números do topo:** captação total (soma da pergunta 1), total de novas contas (2), ROA médio (6) e objetivo de AuC somado (4), além de quantidade de respostas e horário da última atualização.
  - **Gráficos:**
    - Captação (1) e objetivo de AuC (4) por assessor, em barras.
    - Origem da captação (3) e Fee-Based vs. Comissionamento (8), como médias da equipe em barras empilhadas.
    - Prioridade de alocação (7) pela posição média, da classe mais prioritária para a menos.
    - Contagem por opção: cross-sell PJ (9), régua Sim/Não (10), materiais de apoio (15, incluindo "Outro") e certificações (16).
    - Nota da rotina de relacionamento (12) e teto de churn (13) por assessor.
  - **Respostas abertas no final:** perfil de cliente (5), segmentação (11), indicações (14) e gargalo (18).
  - **Visão de um assessor:** as mesmas seções com as respostas dele, cada número ao lado da média da equipe.
- **Atualização:** a cada 60 segundos e no botão "Atualizar".
- **Senha:** digitada uma vez; o navegador lembra até o gestor clicar em "Sair".

## Decisões técnicas (tomadas pelo Claude)

- **Fonte dos dados:** as abas dos assessores, que são a fonte oficial (desenho anterior). O painel não lê o Consolidado. Correções feitas à mão nas abas aparecem no painel.
- **Leitura:** o mesmo Web App já implantado ganha uma ação de leitura. A página envia POST `text/plain` com `{action: "painel", senha}`; a senha vai no corpo, nunca na URL. O envio do formulário (sem `action`) continua idêntico.
- **Resposta da leitura:** lista de assessores com nome da aba, data/hora do envio e as respostas por pergunta, lidas pelo texto da coluna Pergunta, como o Consolidado já faz. Abas sem o cabeçalho esperado são ignoradas.
- **Senha:** guardada nas propriedades do script (`PAINEL_SENHA`), cadastrada pelo próprio gestor nas configurações do projeto do Apps Script, para que o Claude não conheça a senha. Mínimo de 12 caracteres. Sem senha cadastrada, a leitura fica sempre recusada. Senha errada demora cerca de 1 segundo para responder, para dificultar tentativas em sequência.
- **Lembrar a senha:** `localStorage` do navegador do gestor; "Sair" apaga. Se a senha mudar, o painel volta para a tela de senha.
- **Cálculos:** feitos na página, em um módulo JavaScript sem dependências e testável em Node, reaproveitando `shared/questions.js` e as funções de leitura de valores de `shared/logic.js`. Valores não numéricos são ignorados nas somas e médias, como no Consolidado.
- **Gráficos:** Chart.js 4.4.1 via cdnjs, versão fixa.
- **Atualização:** o intervalo de 60 segundos só roda com a aba visível; ao voltar para ela, atualiza na hora.
- **Arquivos:** pasta `painel/` no mesmo repositório, sem build.

## Comportamento

- **Sem senha ou com senha inválida:** tela pedindo a senha, com mensagem de erro clara.
- **Sem nenhuma resposta:** o painel diz que ainda não há respostas, em vez de gráficos vazios.
- **Falha de rede:** o painel mantém os últimos dados e mostra o horário da última atualização bem-sucedida.
- **Assessor selecionado cuja aba foi apagada:** volta ao Consolidado.
- **Celular:** a grade vira uma coluna.

## Decisões complementares (tomadas pelo Claude após a revisão)

- **Campos fora da lista aceita:** ticket médio (2), volume PJ (9) e reuniões por semana (17) entram em um cartão "Outros números", com o valor de cada assessor e a média ou soma da equipe, como no Consolidado. Assim nenhuma resposta fica fora do painel.
- **"Outro" na pergunta 15:** o gráfico mostra uma única barra "Outro" com a quantidade de assessores que usaram o campo. Os textos digitados aparecem completos nas respostas abertas, com o nome do assessor.
- **Horários:** o topo mostra a data e a hora da resposta mais recente (maior "Enviado em" entre as abas) e o horário da última atualização bem-sucedida do painel. Datas editadas à mão que não puderem ser lidas são ignoradas.

## Fica a cargo de quem implementar

- Formato exato do JSON da leitura e nomes internos.
- Cores dos gráficos dentro da identidade visual, legíveis no fundo escuro.
- Escolha entre barra horizontal ou vertical em cada gráfico.

## Passos que dependem do gestor

- Cadastrar a senha em **Configurações do projeto > Propriedades do script** no Apps Script.
- Autorizar o script novamente, se o Google pedir.
