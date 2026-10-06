# Design skills for this project

Installed on 2026-10-06 at the owner's request. Every Claude Code session opened
on this repo loads them automatically. Each folder keeps its upstream licence.

| Skill(s) | Source (commit) | Licence |
|---|---|---|
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill (477bcb2) | MIT |
| `animate`, `animation-vocabulary`, `apple-design`, `break-ui`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `prototype`, `review-animations` | emilkowalski/skills (e8a175d) | MIT |
| `taste-skill`, `redesign-skill`, `soft-skill`, `minimalist-skill`, `brutalist-skill`, `output-skill` | leonxlnx/taste-skill (ce26fc2) | MIT |
| `impeccable` | pbakaus/impeccable, `plugin/skills/impeccable` (0f49bbe) | Apache-2.0 (LICENSE + NOTICE.md kept) |

## What was left out, and why

- **zilliztech/claude-context** is not a skill: it is an MCP server for semantic
  code search that needs an OpenAI (or other) embedding key and a Zilliz/Milvus
  vector database, and uploads the code to them. This repo is a few dozen
  files; plain search covers it.
- From emilkowalski/skills: `animate-expo` (React Native), `write-swift` (Swift),
  `ask-sonner` and `pick-ui-library` (React libraries). This site has no
  framework.
- From taste-skill: `image-to-code-skill`, `imagegen-frontend-web`,
  `imagegen-frontend-mobile`, `brandkit` (they need an image generator),
  `stitch-skill` (Google Stitch), `gpt-tasteskill` (the GPT variant) and
  `taste-skill-v1` (superseded by `taste-skill`).

## Changes made to the upstream files

- `ui-ux-pro-max/SKILL.md`: script paths pointed at `${CLAUDE_PLUGIN_ROOT}`,
  which only exists when installed as a plugin. They now read
  `python3 ".claude/skills/ui-ux-pro-max/scripts/..."` (run from the repo
  root). Its `scripts/tests/` were not copied.

## Worth knowing

- `impeccable` runs `scripts/impeccable`, which on first use downloads its engine
  binary from the project's own GitHub releases (checked against a .sha256
  file) into `~/.impeccable/`. If the network blocks it, the skill falls back to
  reading the project files directly.
- `impeccable` and `ui-ux-pro-max --persist` write `PRODUCT.md`, `DESIGN.md` and
  `design-system/` at the repo root. `_config.yml` keeps those off the live site.
