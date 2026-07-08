# ADR-0003: Sinal de sucesso da tarefa

## Status
Aceito

## Contexto
Marcação manual de sucesso/fracasso por sessão tem atrito e será esquecida, furando o dado (ver [ADR-0001](0001-effectiveness-metric.md)).

## Decisão
Sucesso é **inferido automaticamente via git**: commit criado durante a sessão e não revertido dentro de uma janela = sucesso. Janela = **até a próxima sessão no mesmo repositório, ou 48h — o que vier primeiro**.

Repositórios monitorados: **automático**, extraído do path já presente nos logs JSONL de sessão do Claude Code (sem lista manual configurada).

## Consequências
Zero atrito para o usuário. Falso positivo possível se revert acontecer fora da janela; aceito como trade-off do MVP.
