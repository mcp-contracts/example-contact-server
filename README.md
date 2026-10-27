# Example Contact Server

A minimal MCP server demonstrating [mcp-contracts](https://github.com/mcp-contracts/mcp-contracts): the GitHub Action for schema diffing and the `@mcp-contracts/test` library for contract testing.

## What this repo demonstrates

`server.js` is a small contacts server with a committed baseline contract in `contracts/baseline.mcpc.json`. Two workflows run on every pull request:

- **Schema diff** (GitHub Action): captures the live tool schemas, diffs them against the baseline, posts the report as a PR comment and fails the check on breaking changes.
- **Contract tests** (`@mcp-contracts/test`): verifies that the schemas conform to the contract, sends boundary inputs (empty strings, zero values, oversized payloads) and runs behavioral assertions on tool outputs.

To see it in action, fork the repo, change `server.js` on a branch (add a required parameter to a tool, or remove one) and open a pull request.

## Project config

The repo ships an [`mcpcontracts.json`](./mcpcontracts.json), so the mcpdiff commands need no flags: it points at the `contacts` server from `mcp.json` and the committed baseline. In your own repo, scaffold one with `npx @mcp-contracts/cli init`.

```bash
npx mcpdiff check             # capture the live server, compare to the baseline
npx mcpdiff check --watch     # re-check on every file change
npx mcpdiff update            # refresh the committed baseline
```

Explicit flags always win over the config file, for example `--url http://localhost:3000/mcp` to check the HTTP variant instead.

## Quick demo (no server required)

`contracts/demo/` contains two pre-captured snapshots of a contacts server, simulating a v1 to v2 upgrade that hits all three severity levels:

| Change | Severity | Why |
|--------|----------|-----|
| `create_contact`: required param `phone` added | breaking | Existing agents calling without `phone` will fail |
| `search_contacts`: description changed | warning | Potential tool poisoning vector, review the diff |
| `delete_contact`: tool removed | breaking | Agents relying on deletion will fail |
| `export_contacts`: new tool added | safe | New capability, backward-compatible |
| `get_contact`: optional param `include_notes` added | safe | Backward-compatible addition |
| `update_contact`: `email` type narrowed | breaking | Previously accepted formats may now fail |

`npm run demo` runs an automated walkthrough: it inspects both snapshots, diffs them in every output format, demonstrates exit codes and `--fail-on` strictness, and fires a webhook. The pieces by hand:

```bash
npx mcpdiff inspect contracts/demo/v1.0.0.mcpc.json --schema create_contact
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json                   # exit code 1
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --format markdown
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --fail-on warning  # strict
```

## Running locally

```bash
npm install
npm start                              # stdio
npm run start:http                     # http://localhost:3000/mcp (node server.js --http 8080 for another port)
MCP_TOKEN=secret npm run start:sse     # http://localhost:3001/sse, bearer token required
```

`MCP_TOKEN` guards the HTTP and SSE transports; leave it unset to run without authentication. Check either variant against the baseline (the explicit flags override the stdio server from `mcpcontracts.json`):

```bash
npx mcpdiff check --url http://localhost:3000/mcp
npx mcpdiff check --url http://localhost:3001/sse --sse --header "Authorization: Bearer secret"
```

Without the header the SSE server responds 401 and the check fails. The same flags work against any deployed server.

## Contract testing

```bash
npm test                                                                        # contract.test.js via vitest
npx mcpdiff test contracts/baseline.mcpc.json --command "node server.js"        # the same suite from the CLI
```

`contract.test.js` uses `@mcp-contracts/test` to verify that all tool schemas match the contract, that boundary inputs are handled gracefully, and that tool outputs satisfy behavioral assertions.

## Multi-server composition

A second server, `notes-server.js`, and an `mcp.json` composition demonstrate the multi-server features. The notes server deliberately exposes a `search_contacts` tool with a different schema than the contacts server, a conflicting tool name collision.

```bash
npx mcpdiff snapshot --config mcp.json --all --out-dir contracts/composition   # one .mcpc.json per server
npx mcpdiff diff --config mcp.json --baseline contracts/composition            # all servers, one report
npx mcpdiff check-conflicts --config mcp.json                                  # finds the collision, exits 1
npx mcpdiff graph --config mcp.json                                            # or --format mermaid
```

## Webhooks

`diff` and `check` can POST their results to any HTTP endpoint with `--webhook`. A zero-dependency receiver that pretty-prints every payload is included:

```bash
node webhook-receiver.js               # listens on http://localhost:8080 (PORT=9090 for another port)

# In another terminal
npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --webhook http://localhost:8080/webhook
npx mcpdiff check --watch --webhook http://localhost:8080/webhook
```

## Snapshot integrity and signing

Every snapshot carries a `contentHash`. Verify it, or sign snapshots with an Ed25519 or RSA key so consumers can prove a contract came from you:

```bash
npx mcpdiff verify contracts/baseline.mcpc.json                 # content hash only

openssl genpkey -algorithm ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
npx mcpdiff sign contracts/baseline.mcpc.json --key private.pem   # writes contracts/baseline.mcpc.sig
npx mcpdiff verify contracts/baseline.mcpc.json --key public.pem  # hash and signature
```

## CI beyond the GitHub Action

The workflows in this repo use the GitHub Action, but `mcpdiff check` works in any CI system: it captures, diffs, picks the right output format and sets the exit code in one step. In GitHub Actions it also writes to `GITHUB_STEP_SUMMARY`. For monitoring a deployed server, run it on a schedule:

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
