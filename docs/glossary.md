# Glossário — Jarvis

**Jarvis** — fork do CodeBurn + camada extra de sinal de sucesso e insights; assistente local de uso/efetividade do Claude Code.

**CodeBurn** — ferramenta open-source (TypeScript) que lê logs locais de agentes de coding (Claude Code, Cursor, Codex, etc.) e mostra custo/token em CLI, TUI e dashboard web local. Base do fork.

**ccusage** — CLI alternativa, só linha de comando, sem dashboard, referência de maturidade avaliada e descartada como base (sem GUI).

**Provider (padrão CodeBurn)** — módulo que sabe ler o formato nativo de uma ferramenta específica (ex. `src/providers/codex.ts`) e extrai tokens/custo/uso. Novo código do Jarvis segue esse padrão.

**Sinal de sucesso** — inferência automática (via git) de que uma sessão gerou resultado válido: commit criado e não revertido dentro da janela definida (ver ADR-0003).

**Janela de reversão** — prazo para considerar um commit "confirmado": até a próxima sessão no mesmo repo, ou 48h, o que vier primeiro.

**Insight** — sugestão heurística exibida no dashboard sobre efetividade (ex. sessão longa sem commit = alerta).

**Efetividade** — métrica composta: custo gasto + proporção de tarefas concluídas com sucesso (não é volume de tokens isolado).

**MVP** — primeira entrega, sem custo de infraestrutura, tudo local, sem fases (ver ADR-0005).
