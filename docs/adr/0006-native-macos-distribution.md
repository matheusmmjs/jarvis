# ADR-0006: Distribuição nativa macOS — Swift, fora da App Store

## Status
Aceito

## Contexto
O Jarvis hoje só existe como CLI + dashboard web local (Node/TypeScript). Surgiu a ambição de distribuir uma versão nativa pra outros desenvolvedores macOS que usam Claude Code e/ou OpenCode, possivelmente com assinatura.

Princípios declarados pra essa versão: 100% offline por padrão, rápido/leve (roda ao lado de IDEs e ferramentas de IA que já disputam RAM/CPU), acesso direto a arquivo local, chamada opcional a modelo local via Ollama.

Pesquisa de mercado (duas rodadas, ambas parcialmente interrompidas por limite de sessão, mas convergindo com alta confiança nos achados que completaram):

- **Dois concorrentes reais já existem nesse nicho exato**: [ClaudeBar](https://github.com/tddworks/ClaudeBar) (Swift 6.2+/SwiftUI, monitora Claude Code, Codex, Gemini, Copilot, OpenCode) e [Claude Usage Tracker](https://github.com/hamed-elfayome/Claude-Usage-Tracker) (Swift/SwiftUI, binário ~6MB). Ambos distribuem via Homebrew cask + GitHub Releases, nenhum pela Mac App Store.
- **App Store é tecnicamente possível via entitlement de exceção temporária pra ler arquivo fora do sandbox, mas exige justificativa escrita pra cada exceção, submetida pra revisão discricionária da Apple** — não é caminho testado por ninguém comparável.
- **Electron perde na prioridade de performance**: binários Tauri ficam na faixa de 3-10MB contra 50MB+ do Electron (que empacota Chromium + Node inteiros); a mesma direção se repete em uso de RAM em repouso, com múltiplas fontes independentes concordando (números exatos variam por fonte, mas a direção é consistente).
- **Tauri funciona pra menu bar mas não tem suporte nativo** (v2 não tem modo built-in — monta tray icon + janela sem moldura na mão). SwiftUI + `NSStatusItem` é suporte de primeira classe.
- **Ollama é HTTP local puro** (`localhost:11434`), chamável identicamente de qualquer stack — não pesa nessa decisão. O próprio Echo (projeto irmão do usuário) já prova isso funcionando via `URLSession` puro em Swift.
- **Monetização de referência**: Bartender (app de menu bar pra devs/power users) usa modelo híbrido — assinatura anual com trial como padrão recomendado, compra única "legado", tier vitalício pra quem não quer assinatura.

## Decisão
Construir a versão nativa em **Swift/SwiftUI**, distribuída **fora da Mac App Store** (Homebrew cask + GitHub Releases, DMG notarizado quando chegar a hora de compartilhar com terceiros).

## Consequências
- Sem fricção de revisão da App Store; sem sandbox restringindo leitura de arquivo local.
- Sem taxa de 30% da Apple sobre eventual assinatura.
- Notarização (necessária só quando for distribuir pra fora da própria máquina) exige conta de desenvolvedor Apple (US$99/ano) — custo adiado até a decisão de compartilhar, não bloqueia o MVP pessoal.
- Performance/footprint alinhados com o princípio de "leve e rápido" declarado — native Swift bate Electron nessa frente com folga, e empata ou supera Tauri sem o trabalho manual de montar menu bar.
- Modelo de monetização (se/quando decidido) segue o padrão híbrido validado por Bartender, não inventado do zero.
