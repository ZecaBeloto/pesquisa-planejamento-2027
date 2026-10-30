# Pesquisa Planejamento 2027: desenho

## Intenção

O gestor da GR Capital precisa coletar as metas de 2027 de cada assessor do escritório e apresentá-las ao seu superior, com visão da equipe por pergunta e visão individual de cada pessoa.

Foi tentado o Google Forms, mas ele não impede que percentuais em campos separados somem algo diferente de 100%, exigência explícita do gestor. O Microsoft Forms tem a mesma limitação. Por isso a pesquisa será uma página própria.

## Objetivos

- Um único link, igual para todos os assessores, hospedado no GitHub Pages.
- Formulário que só permite o envio com todas as regras atendidas, incluindo somas de 100% em tempo real.
- Uma planilha com uma aba por assessor e a aba "Consolidado" sempre como última.
- Download em Excel (.xlsx) mantendo as abas.
- Visual alinhado à apresentação da GR Capital.

## Fora do escopo

- Gráficos, painéis e o relatório final para o superior. A planilha é a base para ele.
- Login, códigos individuais e links por pessoa.
- Edição de resposta pelo assessor depois do envio.
- Excel atualizado em tempo real no OneDrive.

## O que faria isto ser um fracasso

- Uma resposta enviada se perder ou sobrescrever outra.
- Uma resposta com soma diferente de 100% chegar à planilha.
- A aba Consolidado ficar diferente das abas individuais.
- Respostas ficarem gravadas no repositório do GitHub.

## Decisões do gestor

- **Hospedagem:** página no GitHub.
- **Identificação:** link igual para todos, com nome do assessor obrigatório.
- **Uso esperado:** cada assessor responde uma única vez, e o link circula só entre assessores do escritório. O risco de um link sem proteção é aceito.
- **Armazenamento:** arquivo Excel, com uma aba por assessor e Consolidado no final. Foi apresentado e não contestado o uso de uma planilha do Google baixada como .xlsx.
- **Aba Consolidado:** modelo A: uma linha por pergunta, uma coluna por assessor, seguidas de colunas de Total e Média, com linhas de separação por bloco.
- **Formulário:** modelo A: um bloco por tela, barra de progresso, Voltar/Avançar, e imagem lateral como nos slides.
- **Identidade visual:** baseada em `C:\Memorias\wiki\outputs\2026\apresentacao-mesa-rf-funcionalidades.html`: fundo `#06152C`, dourado `#C8A84B` a `#E2C97E`, fonte Poppins, logo da GR Capital embutido nesse arquivo.

## Decisões técnicas (tomadas pelo Claude)

- **Repositório novo** no GitHub, conta `ZecaBeloto`, separado do CRM. Público, por ser o padrão gratuito do GitHub Pages. Só contém código.
- **Página estática** em HTML, CSS e JavaScript, sem framework nem etapa de build.
- **Recebimento:** Web App do Google Apps Script, ligado à planilha na conta Google do gestor, implantado com acesso "qualquer pessoa". O envio usa POST com `Content-Type: text/plain`, para evitar a verificação prévia de CORS.
- **Primeiro passo da construção:** implantar um Web App descartável e confirmar que uma página externa consegue enviar sem login. Se a conta bloquear, parar e levar ao gestor antes de construir o restante.
- **Concorrência:** `LockService` em cada gravação, para dois envios simultâneos não colidirem.
- **Validação também no servidor:** obrigatórios, somas e formatos são conferidos no Apps Script. Se falhar, nada é gravado e a página mostra o erro.
- **Nome repetido:** nada é sobrescrito. A segunda resposta vai para a aba "Nome (2)" e gera nova coluna no Consolidado; o gestor decide qual vale e apaga a aba da outra.
- **Nomes de aba:** espaços nas pontas removidos e caracteres problemáticos tratados, respeitando o limite de 100 caracteres do Google. Consolidado é reservado e não pode ser usado como nome de assessor.
- **Injeção de fórmula:** textos iniciados por `=`, `+`, `-` ou `@` são gravados como texto.
- **Valores numéricos:** gravados como número, não texto, com formatação de R$ ou %, para que somas e médias funcionem, inclusive no Excel.
- **Proteção contra envio duplo:** botão desativado durante o envio, com tela de confirmação ao final.
- **Falha de rede:** a página mantém o que foi preenchido e permite tentar de novo.

## Perguntas

> **Atualização de 30/10/2026:** as perguntas vigentes estão em `shared/questions.js` (18 perguntas). O gestor trocou "meta" por "objetivo", reduziu a origem da captação a três opções, retirou o AuC atual, ampliou as classes de ativos para oito, acrescentou o perfil de cliente ideal e substituiu NPS e frequência por três perguntas sobre a régua de relacionamento. A lista abaixo registra o escopo original.

Numeração do escopo original, em quatro blocos. Todas são obrigatórias, exceto quando indicado. Antes dos blocos há o campo obrigatório "Nome do assessor".

### Bloco 1: Metas quantitativas e expansão de carteira

1. **Captação Líquida 2027.** Qual é a sua meta de Captação Líquida total para 2027? Moeda. Ex.: R$ 25.000.000,00.
2. **Abertura de contas e ticket médio.** Qual a sua meta de novas contas abertas e o ticket médio esperado por conta? Dois campos lado a lado: Meta de contas (inteiro, ex. 24) e Ticket médio (moeda, ex. R$ 350.000,00).
3. **Origem da captação.** Qual percentual dos tipos de captação que pretende ter para ano que vem? Quatro percentuais, soma obrigatória de 100%, com total em tempo real:
   - Indicações da base atual (Member-get-Member)
   - Prospecção ativa própria (Outbound/Networking)
   - Parcerias B2B / M&A de carteiras
   - Leads e eventos institucionais GR Capital
4. **AuC.** Projeção de AuC da sua carteira. Dois campos de moeda: AuC atual e Meta de AuC em 31/12/2027.

### Bloco 2: Rentabilidade (ROA) e mix de produtos

5. **Meta de ROA anual.** Qual a sua meta de ROA médio anual da carteira para 2027? Percentual. Ex.: 0,75% a.a.
6. **Prioridade de alocação.** Quais classes de ativos serão o foco principal da sua carteira em 2027? Ordenar de 1 a 5, sem repetir posição:
   - Renda Fixa / Crédito Privado (CRI, CRA, Debêntures)
   - Renda Variável e Derivativos (Ações, Opções, FIIs)
   - Fundos Exclusivos e Estruturação Wealth / Off-shore
   - Previdência Privada e Seguros
   - Produtos de Receita Recorrente / Carteiras Administradas / Fee Fixo
7. **Fee-Based vs. Comissionamento.** Qual proporção da sua receita você planeja no modelo Fee-Based vs. Comissionamento Tradicional? Dois percentuais, Fee-based / Consultoria e Transacional / Comissionado, soma obrigatória de 100%.
8. **Cross-sell PJ.** Identifica potencial de cross-sell corporativo na base? Se sim, selecione e estime volume. Seleção múltipla opcional (Câmbio; Crédito Estruturado / Financiamento; M&A / Mercado de Capitais; Gestão de Caixa PJ). O volume total estimado para PJ (R$) é obrigatório somente se houver opção marcada.

### Bloco 3: Qualidade, retenção e relacionamento (NPS)

9. **NPS e régua.** Meta de NPS individual da carteira e periodicidade de contato por cliente. Número de 0 a 100 (ex. 80) e lista: Mensal, Bimestral, Trimestral.
10. **Teto de churn.** Qual é a taxa máxima aceitável de Churn de Clientes / Evasão de Custódia em 2027? Percentual. Ex.: 3,5% a.a.
11. **Indicações.** Quais rotinas ou processos práticos você implementará para transformar clientes promotores em geradores de indicação? Texto longo.

### Bloco 4: Estrutura, capacitação e gargalos operacionais

12. **Apoio da mesa.** Quais materiais de apoio da mesa são mais prioritários para aumentar sua conversão? Seleção múltipla, ao menos uma, com "Outro" e campo aberto:
    - Relatórios comparativos de carteira e lâminas de produtos
    - Estruturação de teses macro e carteiras recomendadas
    - Apoio de especialistas da mesa em reuniões com prospects
    - Ferramentas de CRM / automação de follow-up
13. **Certificações.** Planeja tirar ou renovar certificações em 2027? Seleção múltipla, ao menos uma: CFP®; CGA / CGE; CEA; PQO / Ancord; Cursos de Estruturação Off-shore / Wealth; Nenhuma / Já certificado. "Nenhuma / Já certificado" desmarca as demais e vice-versa.
14. **Funil semanal.** Quantas reuniões de prospecção e revisão de carteira você pretende realizar por semana para sustentar seu funil? Inteiro. Ex.: 12 reuniões/semana.
15. **Gargalos.** Qual é o principal gargalo operacional, burocrático ou de rotina que consome seu tempo e impede você de focar no relacionamento e captação? Texto longo.

## Comportamento do formulário

- A primeira tela pede o nome. Depois vêm os quatro blocos e uma tela de confirmação.
- Avançar só libera o próximo bloco com o atual válido, indicando o que falta junto ao campo.
- Moeda aceita o padrão brasileiro e é formatada ao digitar. Percentual aceita vírgula decimal.
- Funciona em celular; a imagem lateral some em telas estreitas.
- Sair da página sem enviar perde o preenchimento. Guardar rascunho fica de fora.

## Planilha

Cada aba de assessor tem: pergunta, resposta e data/hora do envio, na mesma ordem do formulário. Perguntas com vários campos ocupam uma linha por campo.

A aba Consolidado segue o modelo A:

| Tipo de resposta | Coluna de cada assessor | Total | Média |
|---|---|---|---|
| R$ e quantidades | Valor | Soma | Média |
| Percentuais | Valor | Não se aplica | Média |
| NPS | Valor | Não se aplica | Média |
| Seleção múltipla | Opções marcadas | Contagem por opção, ex.: "CFP®: 3; CEA: 1" | Não se aplica |
| Ranking | Posição por classe | Não se aplica | Posição média |
| Frequência (lista) | Opção | Contagem por opção | Não se aplica |
| Texto aberto | Texto integral | Não se aplica | Não se aplica |

**Fonte oficial (decisão do gestor):** as abas dos assessores são a fonte oficial, e o Consolidado é sempre gerado a partir delas.

- Correções são feitas na aba do assessor, e o Consolidado acompanha.
- Apagar uma aba, como "Nome (2)", remove a coluna dela do Consolidado.
- Edições diretas no Consolidado não são preservadas, e a aba deve deixar isso claro.

Total e Média são fórmulas. O Consolidado permanece como última aba após cada novo envio. No arquivo .xlsx baixado, as abas e os valores precisam aparecer corretos; o mecanismo de atualização só precisa funcionar na planilha do Google.

## Fica a cargo de quem implementar

- Estrutura de arquivos, nomes internos e formato JSON do envio.
- Forma de interação do ranking, desde que funcione em celular.
- Imagem lateral, aproveitando as dos slides quando apropriado.
- Testes automatizados da lógica de validação e de um envio real de ponta a ponta antes da entrega.

## Passos que dependem do gestor

- Autorizar o Apps Script na conta Google, como feito no Forms.
- Publicar o repositório: criar um repositório público e ativar o GitHub Pages são ações visíveis externamente e serão confirmadas antes.

## Relação com o trabalho anterior

O Google Forms "Planejamento 2027 | Assessores GR Capital" e sua planilha seguem publicados, mas não serão usados. O link não deve ser enviado aos assessores, e os arquivos podem ser apagados pelo gestor.
