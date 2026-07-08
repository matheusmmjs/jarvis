# ADR-0005: Escopo de entrega, estrutura do módulo e nome

## Status
Aceito

## Contexto
Escopo poderia ser faseado (dashboard → sucesso via git → insights) para reduzir risco, mas usuário optou por entregar tudo junto na primeira versão.

## Decisão
- Entrega: **tudo de uma vez** — dashboard de uso + sinal de sucesso via git + insights heurísticos, sem fases.
- Estrutura: novo código mora **dentro do fork**, como módulo próprio seguindo o padrão de provider do CodeBurn (ver [ADR-0002](0002-base-on-codeburn.md)). Estado próprio (sucesso via git, cache de insight) fica em pasta **separada da config core do CodeBurn** (ex.: `~/.config/jarvis/`), para não colidir em caso de merge futuro com upstream.
- Nome do projeto: **Jarvis**.
- Local do repositório: `/Users/raquelcardoso/Projects/local/jarvis`.

## Consequências
Maior superfície de risco por entregar tudo junto (sem checkpoint intermediário), aceito por decisão explícita do usuário.
