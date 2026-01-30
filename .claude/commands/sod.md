# /sod - Start of Day

This script will prepare your session by loading context, caching documentation, and displaying current work priorities from GitHub.

## Execution

First, ensure the SOD script exists locally. If not, bootstrap it from crane-context:

```bash
mkdir -p scripts
if [ ! -f scripts/sod-universal.sh ]; then
  echo "Bootstrapping sod-universal.sh from crane-context..."
  curl -sS "https://crane-context.automation-ab6.workers.dev/sod" \
    -H "X-Relay-Key: $CRANE_CONTEXT_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"agent":"bootstrap","venture":"kidexpenses","repo":"kidexpenses/ke-console","include_docs":false}' \
    | jq -r '.scripts.scripts[] | select(.script_name == "sod-universal.sh") | .content' > scripts/sod-universal.sh
  chmod +x scripts/sod-universal.sh
fi
```

Then run the SOD script:

```bash
bash scripts/sod-universal.sh
```

## After Running

1. **CONFIRM CONTEXT**: State the venture and repo shown in the Context Confirmation box. Verify with user this is correct.
2. **STOP** and wait for user direction. Do NOT automatically start working on issues.
3. Present a brief summary and ask "What would you like to focus on?"

## Wrong Repo Prevention

If you create any GitHub issues during this session, they MUST go to the repo shown in Context Confirmation. If you find yourself targeting a different repo, STOP and verify with the user before proceeding.
