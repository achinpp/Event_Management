/**
 * Penpot MCP Client Wrapper
 * Handles communication with the remote Penpot MCP Server using the HTTP Streamable transport.
 */

const PENPOT_MCP_URL = process.env.PENPOT_MCP_URL || 'http://194.233.95.35:4401/mcp';
const PENPOT_MCP_TOKEN = process.env.PENPOT_MCP_TOKEN || '';

const getBaseUrl = () => `${PENPOT_MCP_URL}?userToken=${PENPOT_MCP_TOKEN}`;

/**
 * Parses the SSE format returned by the MCP HTTP stream.
 */
function parseSseResponse(text: string) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonData = line.substring(6);
      try {
        return JSON.parse(jsonData);
      } catch (e) {
        console.error('Failed to parse SSE data line:', jsonData);
      }
    }
  }
  throw new Error('No valid data block found in MCP response.');
}

/**
 * Establishes an MCP session.
 * @returns The session ID string.
 */
async function initializeSession(): Promise<string> {
  const initBody = {
    jsonrpc: "2.0",
    method: "initialize",
    id: 1,
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "eventpilot-backend", version: "1.0" }
    }
  };

  const initRes = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(initBody)
  });

  if (!initRes.ok) {
    throw new Error(`MCP Initialization failed: ${initRes.status} ${initRes.statusText}`);
  }

  // The session ID can be in mcp-session-id or Mcp-Session-Id
  const sessionId = initRes.headers.get('mcp-session-id') || initRes.headers.get('Mcp-Session-Id');
  if (!sessionId) {
    throw new Error('MCP server did not return a session ID.');
  }

  // Send the initialized notification
  const notifBody = {
    jsonrpc: "2.0",
    method: "notifications/initialized"
  };

  await fetch(getBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify(notifBody)
  });

  return sessionId;
}

/**
 * Executes a tool on the Penpot MCP server.
 * @param timeoutMs - Timeout in milliseconds (default 90s)
 */
async function callTool(toolName: string, args: Record<string, any>, timeoutMs = 90000) {
  const sessionId = await initializeSession();

  const toolBody = {
    jsonrpc: "2.0",
    method: "tools/call",
    id: 3,
    params: {
      name: toolName,
      arguments: args
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let toolRes: Response;
  try {
    toolRes = await fetch(getBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify(toolBody),
      signal: controller.signal
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`MCP tool '${toolName}' timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!toolRes.ok) {
    throw new Error(`MCP tool call failed: ${toolRes.status} ${toolRes.statusText}`);
  }

  const responseText = await toolRes.text();
  const parsed = parseSseResponse(responseText);

  if (parsed.error || (parsed.result && parsed.result.isError)) {
    console.error("MCP Tool Error Payload:", parsed);
    const errorText = parsed.result?.content?.[0]?.text || parsed.error?.message || "Unknown error";
    throw new Error(`Tool Execution Failed: ${errorText}`);
  }

  return parsed.result;
}

/**
 * Executes JavaScript code in the Penpot context.
 * Expects the script to return a string (e.g. JSON string).
 */
export async function executePenpotCode(code: string): Promise<string> {
  const result = await callTool('execute_code', { code });
  const content = result?.content?.[0]?.text;
  if (!content) {
    throw new Error('No content returned from execute_code');
  }
  
  try {
    const parsedObj = JSON.parse(content);
    return typeof parsedObj.result === 'string' ? parsedObj.result : JSON.stringify(parsedObj.result);
  } catch (e) {
    return content;
  }
}

/**
 * Exports a shape as SVG or PNG from the currently connected Penpot file.
 * Returns the base64 encoded image string or raw SVG text.
 */
export async function exportPenpotShape(shapeId: string, format: 'svg' | 'png' = 'svg'): Promise<string> {
  const result = await callTool('export_shape', { shapeId, format, mode: 'shape' });
  const content = result?.content?.[0]?.text;
  if (!content) {
    throw new Error('No content returned from export_shape');
  }
  
  return content;
}
