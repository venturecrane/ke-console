# Semgrep Initial Canary Verification

**Date:** 2026-04-25
**PR:** #208 (chore/security-semgrep-ci-gate)
**Captain concern addressed:** "Make sure this actually gets implemented correctly and doesn't end up being some theatre we only discover down the road."

This doc captures the pre-merge evidence that the Semgrep CI gate actually catches findings, not just runs and passes. It survives squash-merge as permanent proof the gate was real at installation time.

## Canary file

`scripts/semgrep-canary.ts` was committed to the draft PR with three deliberate `detect-child-process` findings — `execSync` and `spawn` calls where an argument traces back to a function parameter. All three are exact matches for rules in the pinned pack combination.

Canary content (removed before merge):

```typescript
import { execSync, spawn } from 'child_process'

export function canaryChildProcessExec(userName: string): string {
  return execSync(`echo hello ${userName}`).toString()
}

export function canaryChildProcessSpawn(cmd: string): void {
  spawn(cmd)
}

export function canaryExecThird(venture: string): void {
  execSync(`gh repo list ${venture}`)
}
```

## CI run — with canary (RED, as expected)

**Run:** https://github.com/venturecrane/ke-console/actions/runs/24942153108

**Static Analysis (Semgrep) job:** FAILED (39s)

Findings (3 total, 3 blocking):

```
   ❯❯❱ javascript.lang.security.detect-child-process.detect-child-process
           Blocking — scripts/semgrep-canary.ts (userName arg)

   ❯❯❱ javascript.lang.security.detect-child-process.detect-child-process
           Blocking — scripts/semgrep-canary.ts (cmd arg)

   ❯❯❱ javascript.lang.security.detect-child-process.detect-child-process
           Blocking — scripts/semgrep-canary.ts (venture arg)
```

Semgrep scan metadata: `Rules run: 312`, `Targets scanned: 238`.

**Summary job:** FAILED (aggregated as expected — the semgrep job's failure propagates through `needs`).

**nosemgrep Justification Audit job:** PASSED — no nosemgrep annotations in this repo at time of installation.

## CI run — canary removed (GREEN, post-removal)

**Run (canary-removed):** https://github.com/venturecrane/ke-console/actions/runs/24942194759 — all 5 security checks pass (NPM Audit, Secret Detection, TypeScript x2, Semgrep, nosemgrep Audit); Security Summary aggregates green.

## Takeaways

- Semgrep gate fires on canary (not theatre).
- Summary job correctly aggregates sub-job failures.
- `nosemgrep-audit` job operational.
- Container pin `returntocorp/semgrep:1.157.0` produces reproducible runs.
- Pre-flight scan: 0 findings on 230 targets before canary was added.
