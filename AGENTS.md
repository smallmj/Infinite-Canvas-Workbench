# AGENTS.md

Working conventions for AI agents in this repo.

## Agent skills

### Issue tracker

Issues live on this repo's fork: `smallmj/ComfyUI-Local-Infinite-Canvas`.
Always pass `-R smallmj/ComfyUI-Local-Infinite-Canvas` to `gh` — inside this
fork clone, `gh` silently resolves to the upstream parent instead. Never file
triage issues into the upstream repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — the five canonical role strings used as-is:
`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `GLOSSARY.md` + `docs/adr/` at the repo root
(created lazily by `/domain-modeling` when needed). See `docs/agents/domain.md`.
