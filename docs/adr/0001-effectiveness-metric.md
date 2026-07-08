# ADR-0001: Métrica de efetividade

## Status
Aceito

## Contexto
Dor original: não saber quantos tokens/custo está gastando no Claude Code, nem se está sendo efetivo.

## Decisão
Efetividade = **custo em dinheiro + tarefas completadas com sucesso**, não apenas volume de tokens. Volume sozinho não diz se o trabalho gerou resultado.

## Consequências
Precisa de dois eixos de dado: consumo (tokens/custo, via logs locais) e resultado (sucesso/fracasso da tarefa, via sinal externo — ver [ADR-0003](0003-success-signal.md)).
