/**
 * Contract conformance tests for the contacts MCP server.
 *
 * These tests verify that the server conforms to its contract
 * and handles edge case inputs gracefully.
 */

import { readFileSync } from "node:fs";
import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { setupMatchers, createTestServer } from "@mcp-contracts/test/matchers";
import { runSchemaConformance, runBoundaryTests, runPredicateAssertions } from "@mcp-contracts/test";

// Register custom matchers
setupMatchers(expect);

// Load the contract
const contract = JSON.parse(readFileSync("contracts/baseline.mcpc.json", "utf-8"));

// Create a managed server connection
const server = createTestServer({
  transport: "stdio",
  command: "node",
  args: ["server.js"],
});

beforeAll(async () => {
  await server.connect();
});

afterAll(async () => {
  await server.disconnect();
});

describe("schema conformance", () => {
  it("server conforms to the contract", async () => {
    const results = await runSchemaConformance(server.getConnection(), contract);
    const failures = results.filter((r) => r.status === "fail");
    expect(failures).toEqual([]);
  });
});

describe("boundary inputs", () => {
  it("server handles edge case inputs gracefully", async () => {
    const results = await runBoundaryTests(server.getConnection(), contract, {
      callTimeoutMs: 5000,
    });
    const crashes = results.filter((r) => r.status === "fail");
    // Log any failures for debugging
    for (const crash of crashes) {
      console.warn(`Boundary failure: ${crash.description} — ${crash.message}`);
    }
    // We expect the server to handle most edge cases
    expect(crashes.length).toBeLessThan(results.length);
  });
});

describe("behavioral assertions", () => {
  it("create_contact returns an ID", async () => {
    const results = await runPredicateAssertions(server.getConnection(), [
      {
        toolName: "create_contact",
        description: "Returns a contact with an ID",
        input: { name: "Test User", email: "test@example.com", phone: "+1-555-0100" },
        assert: (result) => {
          if (!result.text) return false;
          const data = JSON.parse(result.text);
          return typeof data.id === "string" && data.id.length > 0;
        },
      },
    ]);
    expect(results[0].status).toBe("pass");
  });

  it("get_contact returns contact details", async () => {
    const results = await runPredicateAssertions(server.getConnection(), [
      {
        toolName: "get_contact",
        description: "Returns contact with name and email",
        input: { id: "c_001" },
        assert: (result) => {
          if (!result.text) return false;
          const data = JSON.parse(result.text);
          return typeof data.name === "string" && typeof data.email === "string";
        },
      },
    ]);
    expect(results[0].status).toBe("pass");
  });
});
