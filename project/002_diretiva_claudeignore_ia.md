# 002 - Diretiva .claudeignore para economia de tokens

## Resumo
Foi adicionada a diretiva `/.claudeignore` na raiz do repositorio para reduzir custo de tokens em interacoes de IA, priorizando leitura de arquivos de negocio e evitando artefatos pesados/gerados.

## Decisao
- Nome adotado: `.claudeignore`.
- Leitura obrigatoria antes de varreduras amplas no repositorio.
- Politica de excecao: se um item ignorado for indispensavel para resolver uma tarefa, solicitar confirmacao explicita ao usuario antes de ler.

## Implementacao aplicada
1. Criado arquivo `/.claudeignore` com grupos de ignore:
   - dependencias e cache
   - artefatos de build
   - logs e temporarios
   - documentos e dumps pesados
   - segredos e chaves
2. Inserida regra de leitura obrigatoria no topo de `.github/copilot-instructions.md`.
3. Adicionada referencia curta da diretiva global em:
   - `.github/instructions/backend.instructions.md`
   - `.github/instructions/frontend.instructions.md`
   - `.github/instructions/database.instructions.md`

## Motivacao tecnica
- Reduzir contexto inutil enviado para IA.
- Melhorar foco em codigo de dominio e regras de negocio.
- Evitar risco de leitura acidental de segredos e artefatos volumosos.

## Observacao
A diretiva e operacional para o fluxo de trabalho dos agentes. Caso seja necessario investigar item ignorado, a excecao deve ser justificada e aprovada pelo usuario na tarefa ativa.
