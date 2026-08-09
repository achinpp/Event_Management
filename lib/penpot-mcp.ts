import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface PenpotMCPTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

export class PenpotMCPService {
  private client: Client | null = null;

  async getClient(): Promise<Client | null> {
    if (this.client) return this.client;

    const mcpUrl = process.env.PENPOT_MCP_URL;
    if (!mcpUrl) {
      console.warn("PENPOT_MCP_URL is not configured in environment.");
      return null;
    }

    try {
      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
      const client = new Client(
        { name: "EventPilot-Agent", version: "1.0.0" },
        { capabilities: {} }
      );

      // Connect with a 10s timeout budget
      await Promise.race([
        client.connect(transport),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Penpot MCP connection timeout")), 10000)
        ),
      ]);

      this.client = client;
      return client;
    } catch (err) {
      console.error("Failed to connect to Penpot MCP Server:", err);
      return null;
    }
  }

  async listTools(): Promise<PenpotMCPTool[]> {
    const client = await this.getClient();
    if (!client) return [];
    try {
      const response = await client.listTools();
      return response.tools || [];
    } catch (err) {
      console.error("Error listing Penpot MCP tools:", err);
      return [];
    }
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const client = await this.getClient();
    if (!client) throw new Error("Penpot MCP Client is not connected");
    return client.callTool({ name, arguments: args });
  }
}

export const penpotMCP = new PenpotMCPService();
