/**
 * Notes MCP Server — v1.0.0
 *
 * A second server for demonstrating mcpdiff's multi-server features:
 *   - `search_contacts` deliberately collides with contacts-server's tool
 *     of the same name, with a DIFFERENT schema (conflicting collision).
 *   - `add_note` / `list_notes` are unique to this server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "notes-server",
  version: "1.0.0",
});

// ⚠ Collides with contacts-server's search_contacts — different schema
server.registerTool(
  "search_contacts",
  {
    description: "Search notes for mentions of a contact",
    inputSchema: z.strictObject({
      contact_name: z.string().describe("Contact name to search notes for"),
    }),
  },
  async ({ contact_name }) => ({
    content: [{ type: "text", text: JSON.stringify({ contact_name, notes: [] }) }],
  }),
);

server.registerTool(
  "add_note",
  {
    description: "Attach a note to a contact",
    inputSchema: z.strictObject({
      contact_id: z.string().describe("The contact's unique identifier"),
      text: z.string().describe("Note text"),
    }),
  },
  async ({ contact_id, text }) => ({
    content: [{ type: "text", text: JSON.stringify({ contact_id, text, saved: true }) }],
  }),
);

server.registerTool(
  "list_notes",
  {
    description: "List all notes for a contact",
    inputSchema: z.strictObject({
      contact_id: z.string().describe("The contact's unique identifier"),
    }),
  },
  async ({ contact_id }) => ({
    content: [{ type: "text", text: JSON.stringify({ contact_id, notes: [] }) }],
  }),
);

await server.connect(new StdioServerTransport());
