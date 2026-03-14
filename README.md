# Example Contact Server

A minimal MCP server demonstrating the [mcp-contracts GitHub Action](https://github.com/mcp-contracts/github-action).

## What this repo demonstrates

This repo has a simple MCP server (`server.js`) with a baseline contract snapshot in `contracts/baseline.mcpc.json`. When a pull request modifies `server.js`, the GitHub Action automatically:

1. Captures the current MCP tool schemas from the server
2. Diffs them against the baseline snapshot
3. Posts a PR comment with the diff report
4. Fails the check if breaking changes are detected

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
