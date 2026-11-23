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

### Upstream relationship

This fork is the canonical trunk. **Do not open pull requests against the
upstream repo** (`1314521gjy/ComfyUI-Local-Infinite-Canvas`). Upstream closes
PRs without review or comment and absorbs their code into its own release
commits — verified 2026-11-23: our #13 `randomId` MOSS fix (2026-10-31)
shipped upstream as `d07f989` "MOSS non-secure-context fix" (2026-11-01)
while the PR was closed unmerged and uncommented.

Work lands on the fork's `main`. Upstream code is pulled for reference only
(`git fetch upstream`), then private features are replayed onto the new
release (`feat: replay private features onto …`). No upstream PRs, ever.
