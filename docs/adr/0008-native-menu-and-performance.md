# ADR-0008: Menu clássico (não SwiftUI) + leitura assíncrona/paralela

## Status
Aceito

## Contexto
Depois do MVP nativo funcionando (ver ADR-0006/0007), duas iterações rápidas:

1. Tentamos trocar o menu de `NSStatusItem`/`NSMenu` (AppKit clássico) pra `MenuBarExtra` do SwiftUI com `.menuBarExtraStyle(.window)`, buscando um visual melhor (cor, tipografia, layout). O resultado: o dropdown parou de abrir ao clicar — sem crash, sem erro visível, só não funcionou de forma confiável no teste real na máquina do usuário.
2. Separado disso, medimos (via flag `--bench`) que o cálculo de efetividade levava **14.55s** — 7.06s só pra ler os arquivos JSONL, 7.49s pros `git log` (6 repositórios, um atrás do outro). Isso fazia o clique no ícone parecer "não abriu", quando na real o menu só estava travado esperando o `menuWillOpen` terminar.

## Decisão
- **Voltar pro `NSMenu` clássico**, com hierarquia visual via `NSAttributedString` (negrito pra número, cinza pro resto — sem cor, por preferência explícita do usuário). Mais simples, mais leve, e — mais importante — comprovadamente funciona.
- **Cortar leitura de arquivo por data de modificação antes de abrir o conteúdo**: um arquivo de sessão só é reescrito enquanto a sessão está ativa, então "não modificado hoje" garante "nenhuma linha de hoje" sem precisar ler nada. Isso sozinho derrubou o parse de 7.06s pra 0.42s.
- **Paralelizar as checagens de `git log`** com `withTaskGroup` em vez de rodar uma de cada vez. Derrubou de 7.49s pra 0.47s.
- **Tornar o cálculo assíncrono** (`refresh() async`, disparado via `Task { }` dentro de `menuWillOpen`): o menu abre imediatamente com o valor anterior e os itens se atualizam sozinhos quando o resultado chega, em vez de travar a UI esperando.

Resultado medido: **14.55s → 0.89s** (16x).

## Consequências
- Perdemos a liberdade visual do SwiftUI (cor, layout customizado) — aceito, já que o usuário preferiu texto neutro mesmo, e a prioridade declarada (ADR-0006) é performance/simplicidade acima de estética.
- `GitEffectiveness.todaySummary()` e `ClaudeSessions.today()` continuam sendo recalculados a cada abertura do menu (sem cache entre sessões) — aceitável no volume atual (segundos → menos de 1s), revisar se o número de projetos/sessões crescer muito.
- O padrão "checa mtime do arquivo antes de ler conteúdo" e "roda operações de I/O independentes em paralelo" viram convenção pra qualquer leitura futura de dado local no Jarvis nativo (ex: se um dia ler também sessões do OpenCode).
