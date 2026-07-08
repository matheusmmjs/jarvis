# Product

## Register

product

## Users

A single developer (the owner) reviewing their own Claude Code usage on their Mac, typically between coding sessions or at end of day. Context: quick check-in, not prolonged analysis. The job: "am I spending well, and is the work actually landing?"

## Product Purpose

Jarvis is a local-only effectiveness dashboard for Claude Code, forked from CodeBurn. Beyond cost/token tracking, it derives a success signal from git (commits that survive a revert window) and surfaces heuristic insights. Success looks like: the owner opens it, understands in under 30 seconds whether their AI spend is converting into durable work, and gets one actionable nudge when it isn't. Long-term ambition: evolve into a local personal assistant ("brain") that proactively suggests improvements.

## Brand Personality

Calm, reliable copilot. Precise and understated — the data speaks, the interface doesn't. Confidence through quiet accuracy, not through visual noise. Never alarmist; a warn is a nudge, not a siren.

## Anti-references

- Generic SaaS dashboard: identical card grids, big-number-small-label hero metrics, gradient accents, template feel.
- Dense corporate observability panels (Grafana/Datadog): wall-of-charts clutter.
- Cute/gamified apps: confetti, streaks, emoji-driven tone.

## Design Principles

1. **Answer first, evidence second.** The top of every surface answers "is it working?"; detail supports, never competes.
2. **Insights are guests, not billboards.** A suggestion earns its space by being actionable; otherwise it stays quiet.
3. **Local and private is a feature.** The UI should feel personal and self-contained, never like a cloud product's login-walled shell.
4. **Inherit CodeBurn's restraint.** Extend the existing visual system (its tokens, type, spacing) rather than bolting on a second design language.
5. **Trustworthy numbers.** Provisional data (open revert windows) is visibly provisional; never present an estimate as a fact.

## Accessibility & Inclusion

WCAG AA: body text contrast ≥ 4.5:1, keyboard navigable, `prefers-reduced-motion` respected. Single known user, no additional accommodations required.
