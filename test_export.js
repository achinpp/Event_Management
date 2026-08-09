const PENPOT_MCP_URL = 'http://194.233.95.35:4401/mcp';
const PENPOT_MCP_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.uGcckFexT2OSxIPdb5B6KmnFKuockIS7FPVNZUU_JpVx5mvbl6i9mQ.TgshiYhZTJjCGRxg.WOU7DLcfZ8RD-1C19191XqaHHwLZfQtxt5zOhX0lm72S48WwpsrWhZTERAqT10XQo09gnJWYvfkpv3B5NfkJDvLsIdwHqc9OuI-RM4TOmLVQumJ-FEI-QW7f6NLs2i05rwOMpEsi63gcidmRdYecIfKJv2F-IJUg3Ye4Gy4V_v8qmBhW_THt9JwuPVlD1yZJS5eOK5R5Ca6Y.fQngwWBacI8QJWybkzFrjA';

function parseSseResponse(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonData = line.substring(6);
      try {
        return JSON.parse(jsonData);
      } catch (e) {
      }
    }
  }
}

async function run() {
  const baseUrl = `${PENPOT_MCP_URL}?userToken=${PENPOT_MCP_TOKEN}`;
  
  const initRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1, params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }})
  });
  const sessionId = initRes.headers.get('mcp-session-id') || initRes.headers.get('Mcp-Session-Id');
  
  await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
  });

  const toolRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", id: 3, params: { name: "execute_code", arguments: { code: "return penpot.root.children[0].id;" } } })
  });
  
  const text = await toolRes.text();
  const parsed = parseSseResponse(text);
  const content = parsed.result.content[0].text;
  const parsedObj = JSON.parse(content);
  const shapeId = parsedObj.result;
  
  console.log("Shape ID:", shapeId);
  
  const exportRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", id: 4, params: { name: "export_shape", arguments: { shapeId, format: "svg", mode: "shape" } } })
  });
  
  const exportText = await exportRes.text();
  const exportParsed = parseSseResponse(exportText);
  const exportContent = exportParsed.result.content[0].text;
  
  console.log("Export Content First 100 chars:", exportContent.substring(0, 100));
}

run();
