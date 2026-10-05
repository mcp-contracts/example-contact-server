# Example Contact Server

A minimal MCP server demonstrating [mcp-contracts](https://github.com/mcp-contracts/mcp-contracts) — the GitHub Action for schema diffing and the `@mcp-contracts/test` library for contract testing.

## What this repo demonstrates

This repo has a simple MCP server (`server.js`) with a baseline contract snapshot in `contracts/baseline.mcpc.json`. Two CI workflows run on pull requests:

**Schema Diff** (GitHub Action) — automatically:
1. Captures the current MCP tool schemas from the server
2. Diffs them against the baseline snapshot
3. Posts a PR comment with the diff report
4. Fails the check if breaking changes are detected

**Contract Tests** (`@mcp-contracts/test`) — automatically:
1. Verifies server schemas conform to the contract
2. Tests boundary inputs (empty strings, zero values, oversized payloads)
3. Runs behavioral assertions on tool outputs

## Try it yourself

1. Fork this repo
2. Create a branch and modify `server.js` (e.g., add a required parameter to a tool, or remove a tool)
3. Open a pull request
4. Watch the MCP Contract Check workflow run and report changes

## Project config

This repo ships an [`mcpcontracts.json`](./mcpcontracts.json) so the mcpdiff commands need no flags — it points at the `contacts` server from `mcp.json` and the committed baseline. In your own repo, scaffold one with `npx mcpdiff init`.

```bash
npx mcpdiff check             # capture the live server, compare to the baseline
npx mcpdiff check --watch     # re-check on every file change
npx mcpdiff update            # refresh the committed baseline
```

Explicit flags always win over the config file (e.g. `--url http://localhost:3000/mcp` to check the HTTP variant instead).

## Quick demo (no server required)

`contracts/demo/` contains two pre-captured snapshots of a contacts server, simulating a realistic v1 → v2 upgrade that hits all three severity levels:

| Change | Severity | Description |
|--------|----------|-------------|
| `create_contact` — required param `phone` added | 🔴 breaking | Existing agents calling without `phone` will fail |
| `search_contacts` — description changed | 🟡 warning | Potential tool poisoning vector — review the diff |
| `delete_contact` — tool removed | 🔴 breaking | Agents relying on deletion will fail |
| `export_contacts` — new tool added | 🟢 safe | New capability, backward-compatible |
| `get_contact` — optional param `include_notes` added | 🟢 safe | Backward-compatible addition |
| `update_contact` — `email` type narrowed | 🔴 breaking | Previously accepted formats may now fail |

Run the automated walkthrough — it inspects both snapshots, diffs them in every output format, demonstrates exit codes and `--fail-on` strictness, and fires a webhook:

```bash
npm run demo
```

Or run the pieces yourself:

```bash
# Inspect a snapshot's tools, or a single tool's schema
npx mcpdiff inspect contracts/demo/v1.0.0.mcpc.json --tools
npx mcpdiff inspect contracts/demo/v1.0.0.mcpc.json --schema create_contact

# Diff the two snapshots (exit code 1 — breaking changes)
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json

# Machine-readable / markdown output
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --format json
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --format markdown

# Strict mode: fail on warnings too
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --fail-on warning
```

## Running locally

### Stdio (default)

```bash
npm install
npm start
```

The server communicates over stdio using the MCP protocol.

### HTTP transport

```bash
npm run start:http
# or with a custom port:
node server.js --http 8080
```

The server listens on `http://localhost:3000/mcp` (default port 3000) using MCP Streamable HTTP transport.

You can then check it against the baseline with the CLI (the --url flag overrides the stdio server from mcpcontracts.json):

```bash
npx mcpdiff check --url http://localhost:3000/mcp
```

## Contract testing

Run contract conformance tests with:

```bash
npm test
```

This runs `contract.test.js` which uses `@mcp-contracts/test` to:
- Verify all tool schemas match the contract
- Send boundary inputs (empty strings, zero values, etc.) and verify graceful handling
- Run behavioral assertions on tool outputs

You can also run the CLI directly:

```bash
npx mcp-test run contracts/baseline.mcpc.json --command "node server.js"
```

## Multi-server composition

This repo also includes a second server, `notes-server.js`, plus an `mcp.json`
composition to demonstrate mcpdiff's multi-server features (v0.6.0). The notes
server deliberately exposes a `search_contacts` tool with a different schema
than the contacts server — a conflicting tool name collision.

```bash
# Snapshot every server in the composition (one .mcpc.json per server)
npx mcpdiff snapshot --config mcp.json --all --out-dir contracts/composition

# Diff all servers against their baselines in one report
npx mcpdiff diff --config mcp.json --baseline contracts/composition

# Detect the deliberate search_contacts collision (exits 1)
npx mcpdiff check-conflicts --config mcp.json

# Render the composition as a dependency graph
npx mcpdiff graph --config mcp.json
npx mcpdiff --format mermaid graph --config mcp.json
```

## Webhooks

`diff`, `ci`, and `check --watch` can POST their results to any HTTP endpoint with `--webhook`. A minimal zero-dependency receiver is included for testing — it pretty-prints every payload:

```bash
node webhook-receiver.js
# → Listening on http://localhost:8080  (set PORT=9090 for a custom port)

# In another terminal:
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json \
  --webhook http://localhost:8080/webhook

# Fire on every re-check during development
npx mcpdiff check --watch --webhook http://localhost:8080/webhook
```

## Remote servers (SSE & custom headers)

The CLI can talk to remote MCP servers over SSE, with repeatable `--header` flags for authentication. This repo's server can run in SSE mode itself, with an optional bearer token, so you can try the whole flow locally:

```bash
# Start the server in SSE mode with auth required
MCP_TOKEN=secret npm run start:sse
# → listening on http://localhost:3001/sse

# Check it against the committed baseline (in another terminal)
npx mcpdiff check --url http://localhost:3001/sse --sse \
  --header "Authorization: Bearer secret"

# Without the header the server responds 401 and the check fails
npx mcpdiff check --url http://localhost:3001/sse --sse
```

`MCP_TOKEN` also guards the HTTP transport (`npm run start:http`). Leave it unset to run without authentication. The same flags work against any deployed SSE server:

```bash
npx mcpdiff snapshot --url https://mcp.example.com/sse --sse \
  --header "Authorization: Bearer $TOKEN" \
  --header "X-Custom: value"
```

## Snapshot integrity & signing

Every snapshot carries a `contentHash`. You can verify it, and additionally sign snapshots with an Ed25519 or RSA key so consumers can prove a contract came from you:

```bash
# Verify the content hash
npx mcpdiff verify contracts/baseline.mcpc.json

# Sign a snapshot (writes contracts/baseline.mcpc.sig next to it)
openssl genpkey -algorithm ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
npx mcpdiff sign contracts/baseline.mcpc.json --key private.pem

# Verify hash + signature
npx mcpdiff verify contracts/baseline.mcpc.json --key public.pem
```

## CI beyond the GitHub Action

The workflows in this repo use the GitHub Action, but the `ci` command works in any CI system (GitLab, CircleCI, ...) — it captures, diffs, picks the right output format, and sets the exit code in one step. In GitHub Actions it also writes to `GITHUB_STEP_SUMMARY` automatically:

```bash
npx mcpdiff ci --baseline contracts/baseline.mcpc.json --command "node server.js"

# Stricter: fail on warnings too
npx mcpdiff ci --baseline contracts/baseline.mcpc.json --command "node server.js" --fail-on warning
```

For monitoring a deployed server, run `check` on a cron schedule:

```yaml
on:
  schedule:
    - cron: "0 */6 * * *" # every 6 hours
jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx mcpdiff check --url https://mcp.example.com/sse --sse \
            --header "Authorization: Bearer ${{ secrets.MCP_TOKEN }}" \
            --webhook ${{ secrets.WEBHOOK_URL }}
```
