# AGENTS.md

Working conventions for AI agents in this repo.

## Agent skills

### Issue tracker

Issues live on this repo: `smallmj/Infinite-Canvas-Workbench`.
Always pass `-R smallmj/Infinite-Canvas-Workbench` to `gh`. See
`docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — the five canonical role strings used as-is:
`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `GLOSSARY.md` + `docs/adr/` at the repo root
(created lazily by `/domain-modeling` when needed). See `docs/agents/domain.md`.

### Standalone project

This repository is its own project — there is no upstream remote and no
pull-request relationship with any other repository. All changes land on
`main` here; nothing is pushed for outside review or exported as patches to
a sibling project. The MIT copyright notice for the original code is kept in
`LICENSE` and must stay.
