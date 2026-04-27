# 003 - Checklist de economia de tokens

## Objetivo
Padronizar interacoes curtas e eficientes com IA para reduzir custo de tokens sem perder qualidade tecnica.

## Checklist rapido (uso antes de cada tarefa)
1. Definir escopo em 1 objetivo claro.
2. Informar arquivos/alvos exatos a analisar.
3. Pedir resposta curta e formatada (acoes, nao texto longo).
4. Evitar colar logs completos; enviar apenas erro + contexto proximo.
5. Solicitar diff/resumo, nao arquivo inteiro.
6. Evitar scans globais sem filtro.

## Prompt base sugerido
"Objetivo: [1 frase].
Escopo: [arquivos/pastas exatos].
Saida: [maximo de linhas] em bullets.
Se precisar abrir arquivo ignorado pela diretiva de IA, me peça confirmacao antes."

## Politica de excecao
Se algum item ignorado por `/.claudeignore` for realmente necessario para solucionar a tarefa, a IA deve justificar a necessidade e pedir confirmacao explicita antes da leitura.

## Resultado esperado
- Menos contexto irrelevante.
- Respostas mais objetivas.
- Menor custo de token por iteracao.
