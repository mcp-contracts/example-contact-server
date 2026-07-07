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

You can then diff against it with the CLI:

```bash
npx mcpdiff diff --live contracts/baseline.mcpc.json --url http://localhost:3000/mcp
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
