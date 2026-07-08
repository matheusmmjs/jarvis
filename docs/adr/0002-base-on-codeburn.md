# ADR-0002: Fork do CodeBurn como base

## Status
Aceito

## Contexto
MVP precisa ser grátis, 100% local, sem conta/API key. Avaliadas: ccusage (só CLI, sem dashboard), CodeBurn (CLI + dashboard web + menu bar, TypeScript, arquitetura modular por "provider", sem banco próprio — lê JSONL/DB direto do disco), claude-usage, Claude-Code-Usage-Monitor, cc-statistics.

## Decisão
Fork do **CodeBurn** (https://github.com/getagentseal/codeburn) em vez de construir do zero. Reaproveita ingestão de log + dashboard web local já prontos. Novo código soma-se como módulo seguindo o padrão de provider já usado no projeto (`src/providers/*.ts`).

## Consequências
Ganha velocidade de entrega, mas herda stack (TypeScript/Node 22.13+, Swift pro menu bar). Módulos novos devem seguir padrão de provider existente para não fragmentar a arquitetura. Estado próprio (não coberto pelo CodeBurn) fica isolado — ver [ADR-0005](0005-scope-and-naming.md).
