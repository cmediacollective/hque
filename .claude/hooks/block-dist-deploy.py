#!/usr/bin/env python3
"""PreToolUse(Bash) guard: block `netlify deploy --dir=...` (a pre-built upload
that SKIPS the build step, so scripts/sync-roadmap.mjs never runs and the public
Product Updates page at h-que.com/updates silently stops updating).

Deploys must go through the full build: `npx netlify-cli deploy --build --prod`.
Reads the hook JSON on stdin; prints a PreToolUse deny decision when the command
matches, otherwise prints nothing (allow).
"""
import sys, json, re

try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "") or ""
except Exception:
    sys.exit(0)  # can't parse -> don't interfere

is_netlify_deploy = re.search(r"netlify\S*\s+deploy\b", cmd) or re.search(r"netlify\s+deploy\b", cmd)
uses_dir_upload = re.search(r"--dir(=|\s|$)", cmd)

if is_netlify_deploy and uses_dir_upload:
    reason = (
        "Blocked: this deploys with --dir (a pre-built upload) which SKIPS the "
        "Netlify build, so scripts/sync-roadmap.mjs never runs and the public "
        "Product Updates page (h-que.com/updates) will NOT pick up new entries in "
        "roadmap-updates.json. Deploy with the full build instead:\n"
        "  npx netlify-cli deploy --build --prod\n"
        "(If a deploy genuinely must skip the roadmap sync, run it in a terminal "
        "outside Claude.)"
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
