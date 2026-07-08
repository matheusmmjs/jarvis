# Produto

## Register

product

## Usuários

Um único desenvolvedor (o dono) revisando o próprio uso do Claude Code no seu Mac, geralmente entre sessões de código ou no fim do dia. Contexto: checagem rápida, não análise prolongada. O trabalho: "estou gastando bem, e o trabalho está realmente aterrissando?"

## Propósito do Produto

Jarvis é um dashboard de efetividade local, fork do CodeBurn. Além de rastrear custo/tokens, ele deriva um sinal de sucesso via git (commits que sobrevivem a uma janela de reversão) e mostra insights heurísticos. Sucesso parece com: o dono abre, entende em menos de 30 segundos se o gasto com IA está virando trabalho durável, e recebe uma sugestão acionável quando não está. Ambição de longo prazo: evoluir pra um assistente pessoal local ("cérebro") que sugere melhorias proativamente.

## Personalidade da Marca

Copiloto calmo e confiável. Preciso e discreto — o dado fala, a interface não. Confiança através de precisão silenciosa, não de ruído visual. Nunca alarmista; um aviso é um empurrãozinho, não uma sirene.

## Anti-referências

- Dashboard SaaS genérico: grids de cards idênticos, métricas hero de número-grande-label-pequeno, acentos em gradiente, cara de template.
- Painéis corporativos densos de observabilidade (Grafana/Datadog): parede de gráficos poluída.
- Apps fofos/gamificados: confete, streaks, tom guiado por emoji.

## Princípios de Design

1. **Resposta primeiro, evidência depois.** O topo de cada tela responde "está funcionando?"; o detalhe apoia, nunca compete.
2. **Insights são convidados, não outdoors.** Uma sugestão ganha espaço sendo acionável; senão, fica quieta.
3. **Local e privado é uma feature.** A interface deve parecer pessoal e autocontida, nunca como a casca de login de um produto de nuvem.
4. **Herdar a contenção do CodeBurn.** Estender o sistema visual existente (tokens, tipografia, espaçamento) em vez de colar uma segunda linguagem de design.
5. **Números confiáveis.** Dado provisório (janelas de reversão abertas) é visivelmente provisório; nunca apresentar uma estimativa como fato.

## Acessibilidade e Inclusão

WCAG AA: contraste de texto do corpo ≥ 4.5:1, navegável por teclado, `prefers-reduced-motion` respeitado. Um único usuário conhecido, sem acomodações adicionais necessárias.
