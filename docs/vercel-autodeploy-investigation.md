# Vercel GitHub App Auto-Deploy Integration Failure

**Date:** January 30, 2026
**Updated:** January 30, 2026 (v2.0 - Root Cause Identified)
**Investigated by:** Scott Durgan, Claude Code
**Reviewed by:** Tech Advisor 1, Tech Advisor 2
**Affected Team:** SMDurgan LLC (smd-llc) on Vercel
**Affected Projects:** ke-console, dfg-console (and potentially all projects in the team)

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** Vercel IS receiving GitHub push events but is **rejecting auto-deployments** because the commit author email address (`127069276+smdurgan@users.noreply.github.com`) does not match any email registered in the Vercel account (`smdurgan@smdurgan.com`, `smd@durganfieldguide.com`).

The GitHub commit status API reveals the explicit error:
```
"No GitHub account was found matching the commit author email address"
```

**Resolution:** Add the GitHub noreply email to the Vercel account, OR configure git to use a Vercel-registered email.

---

## Issue Description

### Initial Symptom
Pushes to the `kidexpenses/ke-console` repository on GitHub were not triggering automatic deployments on Vercel, despite the project being connected to the repository.

### Expected Behavior
When a commit is pushed to a connected GitHub repository, Vercel should automatically:
1. Receive a push event via the Vercel GitHub App
2. Trigger a new deployment
3. Show the deployment as created "by vercel[bot]"

### Actual Behavior
- Pushes to GitHub do not trigger deployments
- All deployments show user names (smd-dfg, smdurgan, smdurgan-llc, claude) as the trigger source
- No deployments in the team's history show "by vercel[bot]"
- GitHub commit statuses show Vercel rejecting commits with email mismatch error

---

## Root Cause: Email Address Mismatch

### The Problem

Vercel's auto-deploy system validates that the commit author's email matches a GitHub account linked to the Vercel team. When it doesn't match, Vercel silently rejects the auto-deploy.

### Evidence

**Commit SHA:** `bebcb07` (ke-console)

**GitHub Status API Response:**
```bash
gh api repos/kidexpenses/ke-console/commits/bebcb07/status --jq '.statuses[]'
```

```json
{
  "context": "Vercel",
  "state": "failure",
  "description": "No GitHub account was found matching the commit author email address",
  "target_url": "https://docs.github.com/en/github/setting-up-and-managing-your-github-user-account/setting-your-commit-email-address",
  "created_at": "2026-01-30T17:15:05Z"
}
```

### Email Mismatch Details

| Location | Email Address |
|----------|---------------|
| Git commits (local config) | `127069276+smdurgan@users.noreply.github.com` |
| Vercel account (primary) | `smdurgan@smdurgan.com` |
| Vercel account (secondary) | `smd@durganfieldguide.com` |

The GitHub noreply email used in commits is **not registered** in the Vercel account, causing all auto-deploy attempts to be rejected.

### Why dfg-console Appeared to Work

The dfg-console project showed successful deployments, but these were all triggered by:
- Manual `vercel deploy` CLI commands
- Dashboard-triggered deploys
- Claude Code running CLI deployments

These manual deployments **masked** the auto-deploy failures by posting "success" statuses to GitHub after the fact. The native auto-deploy was never working—it was being rejected with the same email mismatch error.

---

## Resolution Options

### Option 1: Add GitHub Noreply Email to Vercel (Recommended)

1. Go to Vercel Account Settings → Authentication
2. Under Email, click "Add Another"
3. Add: `127069276+smdurgan@users.noreply.github.com`
4. Verify the email

### Option 2: Change Git Config to Use Vercel-Registered Email

```bash
git config --global user.email "smdurgan@smdurgan.com"
```

Note: This affects commit attribution and may not be desired if you want commits linked to your GitHub profile.

### Option 3: Keep Workaround (Deploy Hooks)

Continue using the GitHub Actions + Deploy Hook workaround, which bypasses the email validation entirely.

---

## Environment Details

### Vercel Configuration
- **Team:** SMDurgan LLC
- **Team ID:** `team_rL8YWZPVlksPDozoaRWadq32`
- **Plan:** Pro
- **Projects Affected:** ke-console, dfg-console

### GitHub Configuration
- **Organizations:**
  - `kidexpenses` (ke-console repo)
  - `durganfieldguide` (dfg-console repo)
- **Vercel GitHub App:** Installed on both organizations
- **OAuth Connection:** smdurgan-llc account with access to both organizations

### Registered Emails
- **Vercel Account:** `smdurgan@smdurgan.com` (primary), `smd@durganfieldguide.com`
- **Git Commits:** `127069276+smdurgan@users.noreply.github.com`

---

## Troubleshooting Steps & Findings

### Phase 1: Initial Investigation

#### Step 1: Verify GitHub Webhooks
**Action:** Checked for traditional webhooks on both repositories
**Command:** `gh api repos/kidexpenses/ke-console/hooks`
**Result:** Empty array `[]` - No webhooks present
**Conclusion:** Vercel uses GitHub App events, not traditional webhooks

#### Step 2: Verify GitHub App Installation
**Action:** Checked Vercel GitHub App installation on kidexpenses org
**Location:** `github.com/organizations/kidexpenses/settings/installations`
**Result:**
- Vercel app installed with correct permissions
- Read/write access to: administration, checks, code, commit statuses, deployments, issues, pull requests, repository hooks
- Repository access: "All repositories"

**Conclusion:** GitHub App properly installed with full permissions

#### Step 3: Verify OAuth Connection
**Action:** Checked Vercel account's GitHub OAuth authorization
**Location:** GitHub Settings → Applications → Vercel
**Result:** "Vercel has been installed on 2 accounts you have access to: durganfieldguide and kidexpenses"
**Conclusion:** OAuth connection has access to both organizations

#### Step 4: Verify Project Git Settings
**Action:** Compared Git settings between ke-console and dfg-console
**Result:** Both projects showed identical configuration
**Conclusion:** Project-level Git configuration is correct

### Phase 2: Deep Investigation

#### Step 5: Fresh Project Recreation
**Action:** Deleted ke-console project and recreated via GitHub import
**Result:** Initial deployment worked (manual trigger), subsequent pushes did not trigger deployments
**Conclusion:** Not a project configuration issue

#### Step 6: GitHub App Reinstallation
**Action:** Uninstalled and reinstalled Vercel GitHub App on kidexpenses org
**Result:** No change
**Conclusion:** Not a GitHub App installation issue

#### Step 7: Historical Deployment Analysis
**Action:** Reviewed 100+ deployments for dfg-console
**Finding:** Zero deployments showed "by vercel[bot]"
**Conclusion:** Native auto-deploy has never worked for this team

### Phase 3: Root Cause Discovery (Per Tech Advisor Feedback)

#### Step 8: GitHub Commit Status Analysis
**Action:** Checked Vercel statuses on specific commits via GitHub API
**Command:**
```bash
gh api repos/kidexpenses/ke-console/commits/bebcb07/status \
  --jq '.statuses[] | select(.context == "Vercel")'
```

**Result:**
```json
{
  "state": "failure",
  "description": "No GitHub account was found matching the commit author email address"
}
```

**CONCLUSION: ROOT CAUSE IDENTIFIED** - Email mismatch between git commits and Vercel account

#### Step 9: Email Verification
**Action:** Compared commit author emails with Vercel account emails
**Command:**
```bash
git log --format='%ae' -5
# Output: 127069276+smdurgan@users.noreply.github.com

git config user.email
# Output: 127069276+smdurgan@users.noreply.github.com
```

**Result:** Git is configured with GitHub's noreply email, which is not registered in Vercel
**Conclusion:** This is the definitive root cause

---

## Workaround Implemented

### Solution: GitHub Actions + Vercel Deploy Hook

Since the native auto-deploy was failing due to email mismatch, we implemented an alternative using Vercel's Deploy Hook feature triggered by GitHub Actions.

### Implementation for ke-console

**1. Created Deploy Hook in Vercel**
- Location: Project Settings → Git → Deploy Hooks
- Name: `github-action`
- Branch: `main`

**2. Added GitHub Repository Secret**
```bash
gh secret set VERCEL_DEPLOY_HOOK --repo kidexpenses/ke-console --body "<hook-url>"
```

**3. Created GitHub Actions Workflow**

File: `.github/workflows/vercel-deploy.yml`
```yaml
name: Vercel Deploy

on:
  push:
    branches: [main]
    paths:
      - 'app/**'

concurrency:
  group: vercel-prod
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy
        run: |
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

### Verification
- Test push triggered GitHub Action successfully
- GitHub Action called Deploy Hook
- Vercel deployment triggered and completed
- Deployment shows "via Deploy Hook" as trigger source

---

## Current Status

| Item | Status |
|------|--------|
| Root cause identified | ✅ Email mismatch |
| ke-console auto-deploy | ✅ Working (via workaround) |
| dfg-console auto-deploy | ❌ Not working (workaround not yet implemented) |
| Native GitHub App integration | ❌ Blocked by email mismatch |
| kidexpenses.app domain | ⚠️ DNS changes pending |

---

## Remaining Action Items

1. **Fix email mismatch** - Add `127069276+smdurgan@users.noreply.github.com` to Vercel account
2. **Update DNS for kidexpenses.app** - Configure domain registrar to point to Vercel
3. **Implement workaround for dfg-console** - If email fix doesn't resolve, replicate Deploy Hook setup
4. **Test native auto-deploy** - After email fix, verify auto-deploy works without workaround

---

## Technical Details for Vercel Support (If Needed)

### Identifiers
- **Vercel Team ID:** `team_rL8YWZPVlksPDozoaRWadq32`
- **Affected Projects:** ke-console, dfg-console
- **GitHub Organizations:** kidexpenses, durganfieldguide

### Specific Evidence

**Commit that failed auto-deploy:**
- **SHA:** `bebcb07b6ecafd5f18456c45181a3fb2dd1d6bfe`
- **Repo:** `kidexpenses/ke-console`
- **Push time:** 2026-01-30T17:15:01Z
- **Vercel status posted:** 2026-01-30T17:15:05Z
- **Status:** `failure`
- **Error:** "No GitHub account was found matching the commit author email address"

**API Command to Reproduce:**
```bash
gh api repos/kidexpenses/ke-console/commits/bebcb07/status \
  --jq '.statuses[] | select(.context == "Vercel") | {state, description, created_at}'
```

### Questions for Vercel Support

1. Is there documentation on the email validation requirement for auto-deploy?
2. Can this validation be disabled at the team or project level?
3. Why does the email mismatch result in a silent failure (no deployment record) rather than a visible error in the Vercel dashboard?
4. Is there a way to bulk-add email addresses or use wildcard patterns for noreply emails?

---

## Appendix A: Tech Advisor Feedback Summary

### Tech Advisor 1 Key Points
- Recommended checking GitHub commit status API for Vercel responses ✅ Done
- Suggested "canary" project test to isolate team vs project issues
- Recommended team-level Git integration reset as potential fix
- Confirmed Deploy Hook workaround is appropriate

### Tech Advisor 2 Key Points
- Identified "Ghost Installation" theory (Vercel mapping to wrong account)
- Recommended checking GitHub Organization OAuth restrictions
- Suggested checking GitHub App "Recent Deliveries" for webhook failures
- Highlighted that the workaround bypasses the authentication/mapping that's failing

### Combined Insight
Both advisors' recommendations led to checking the GitHub API, which revealed the explicit error message identifying the email mismatch as root cause.

---

## Appendix B: Timeline

| Time | Action | Result |
|------|--------|--------|
| T+0 | Identified ke-console not auto-deploying | Issue confirmed |
| T+10m | Checked webhooks | None found (expected for GitHub App) |
| T+20m | Verified GitHub App installation | Correct permissions |
| T+30m | Verified OAuth connection | Has access to both orgs |
| T+40m | Compared dfg-console settings | Identical configuration |
| T+50m | Deleted and recreated ke-console project | Still not working |
| T+60m | Reinstalled GitHub App on kidexpenses | Still not working |
| T+70m | Analyzed dfg-console deployment history | Zero "vercel[bot]" deployments |
| T+80m | Implemented Deploy Hook workaround | Success |
| T+90m | Received tech advisor feedback | New diagnostic approaches |
| T+100m | Ran GitHub commit status API check | **ROOT CAUSE FOUND** |
| T+110m | Verified email mismatch | Confirmed definitive cause |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Scott Durgan / Claude Code | Initial investigation document |
| 2.0 | 2026-01-30 | Scott Durgan / Claude Code | **Root cause identified** - email mismatch; added tech advisor feedback; updated resolution options |
