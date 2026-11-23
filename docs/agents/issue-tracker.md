# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## This repo is a fork

Issue target: **`smallmj/ComfyUI-Local-Infinite-Canvas`** (this repo's fork).

- Measured 2026-11-20: a bare `gh repo view` inside this clone resolves to the **upstream parent** (`1314521gjy/ComfyUI-Local-Infinite-Canvas`), not the fork. Every `gh issue …` and `gh label …` call must therefore pass `-R smallmj/ComfyUI-Local-Infinite-Canvas` explicitly.
- Never file triage/tickets into the upstream repo. Upstream issues are only filed when the owner explicitly asks to report an upstream bug.
- **Upstream PRs: none.** The fork is the canonical trunk — do not `gh pr create` against the upstream repo, and do not push feature branches for upstream review. Upstream code is pulled for reference only (`git fetch upstream`), then private features are replayed onto the new release. See `AGENTS.md` → **Upstream relationship** for the evidence behind this rule.

## Conventions

- **Create an issue**: `gh issue create -R smallmj/ComfyUI-Local-Infinite-Canvas --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> -R smallmj/ComfyUI-Local-Infinite-Canvas --json number,title,body,labels,comments`.
- **List issues**: `gh issue list -R smallmj/ComfyUI-Local-Infinite-Canvas --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Count open blockers**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers only; 0 means startable). `gh issue view <n> --json blockedBy` also lists closed blockers, so filter it: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Comment on an issue**: `gh issue comment <number> -R smallmj/ComfyUI-Local-Infinite-Canvas --body "..."`
- **Apply / remove labels**: `gh issue edit <number> -R smallmj/ComfyUI-Local-Infinite-Canvas --add-label "..."` / `--remove-label "..."`
- **Close**: post the explanation with `gh issue comment <number> -R smallmj/ComfyUI-Local-Infinite-Canvas --body "..."`, then `gh issue close <number> -R smallmj/ComfyUI-Local-Infinite-Canvas`. On an already-closed issue, `gh issue close --comment` drops the comment and still exits 0.

File issues only into the user's own repo (see **This repo is a fork** above). Before the first `gh issue create` of a session, verify the target with `gh repo view smallmj/ComfyUI-Local-Infinite-Canvas --json nameWithOwner`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number>`, then `gh pr view <number> --comments` (off a TTY, `--comments` prints only the comments, not the body), and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue (on the fork, with `-R smallmj/ComfyUI-Local-Infinite-Canvas`).

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create -R smallmj/ComfyUI-Local-Infinite-Canvas --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: see **Blocking** under Conventions.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (see **Count open blockers**, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> -R smallmj/ComfyUI-Local-Infinite-Canvas --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> -R smallmj/ComfyUI-Local-Infinite-Canvas --body "<answer>"`, then `gh issue close <n> -R smallmj/ComfyUI-Local-Infinite-Canvas`, then append a context pointer (gist + link) to the map's Decisions-so-far.
