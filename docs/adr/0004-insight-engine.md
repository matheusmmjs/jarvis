# ADR-0004: Motor de insights

## Status
Aceito

## Contexto
Visão de futuro: Jarvis deve evoluir de dashboard passivo para "cérebro" que sugere melhorias. Motor via LLM (mesmo local) adiciona setup e risco de custo; heurística fixa é grátis e rápida de validar.

## Decisão
- Motor v1: **heurísticas fixas** (regras sobre padrões, ex.: sessão longa + poucos commits = baixa efetividade). Sem LLM nesta fase.
- Exibição: dentro do **próprio dashboard**, como card de "insights" — não em canal separado (terminal/notificação).
- Cálculo: **sob demanda**, ao abrir o dashboard — sem cron/processo em background.
- Evolução futura: migrar heurística para LLM local (ex. Ollama) quando houver histórico suficiente.

## Consequências
MVP sem custo de infra (sem processo persistente, sem LLM). Qualidade da sugestão limitada até a evolução para LLM local.
