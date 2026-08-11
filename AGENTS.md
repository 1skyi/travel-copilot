# Travel Copilot — AGENTS.md

## Skill Requirement

Before ANY response or action (including clarifying questions, code exploration, or file changes), invoke the `using-superpowers` skill.

Key rules:

- Before creative work (features, components, UI): invoke `brainstorming` first
- Before multi-step implementation: invoke `writing-plans` first
- Before claiming work is done: invoke `verification-before-completion` first
- When encountering bugs: invoke `systematic-debugging` first
- Before implementing features or fixes: invoke `test-driven-development` first

## Project Context

- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS 3.4, shadcn/ui, next-themes
- **Product**: AI travel decision agent — not a travel guide generator
- **Style**: ChatGPT / Perplexity / Notion AI aesthetic — minimal, card-based, lots of whitespace
- **Language**: Chinese (Simplified) for all UI text

## PowerShell Warning

When writing files via PowerShell `Set-Content`, always use `@' '@'` (single-quoted here-string) — NEVER `@" "@` (double-quoted). Double-quoted here-strings will eat JavaScript template literals (`${...}`).
