# ADR-0007: Pacote Swift novo e mínimo, não reaproveitar mac/

## Status
Aceito

## Contexto
O CodeBurn (upstream) já tem um app de menu bar nativo em `mac/` — Swift Package completo com SwiftUI, que reimplementa a lógica de parsing em Swift, independente do backend Node (duplicação de lógica entre as duas interfaces existentes). Esse app também carrega bastante superfície que não é do Jarvis: múltiplas moedas, múltiplos providers de assinatura (Codex, Claude), updater (Sparkle), etc.

O usuário nunca trabalhou com Swift e quer acompanhar o desenvolvimento passo a passo, com o processo o mais simples possível.

## Decisão
Criar um Swift Package **novo e mínimo** em `native/` (raiz do repo Jarvis, ao lado de `dash/` e `src/`), em vez de estender `mac/`. Escopo do MVP: só o que o Jarvis precisa (ler sessões do Claude Code, sinal de efetividade via git, um número na barra de menu) — sem herdar a complexidade acumulada do app do CodeBurn.

## Consequências
- Menos arquivos, menos conceitos simultâneos — mais fácil de acompanhar sendo novo em Swift.
- Sem risco de mexer/quebrar o app nativo do CodeBurn upstream por engano.
- Alguma lógica (leitura de JSONL, sinal de efetividade) fica necessariamente duplicada entre TypeScript e Swift — aceito conscientemente (ver ADR-0006: performance/leveza exclui rodar um processo Node por baixo do app nativo).
- Se o app nativo crescer muito, uma consolidação futura com `mac/` (ou substituição dele) vira uma decisão própria, não decidida aqui.
