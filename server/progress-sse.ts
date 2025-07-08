import type { Response } from "express";

// Store active SSE connections for progress updates
const progressConnections = new Map<string, Response>();

// Helper function to send SSE message
export function sendProgressUpdate(analysisId: string, data: any) {
  console.log(`📤 Sending progress update for ${analysisId}:`, data);
  const connection = progressConnections.get(analysisId);
  if (connection && !connection.headersSent) {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      console.log(`📨 Writing to SSE connection: ${message.trim()}`);
      connection.write(message);
    } catch (error) {
      console.error(`❌ Error sending progress update for ${analysisId}:`, error);
      // Connection may have been closed, remove it
      progressConnections.delete(analysisId);
    }
  } else {
    console.log(`⚠️ No active connection for ${analysisId} or headers already sent`);
  }
}

// Setup SSE endpoint
export function setupProgressSSE(app: any) {
  app.get('/api/progress/:analysisId', (req: any, res: Response) => {
    const analysisId = req.params.analysisId;
    console.log(`🔌 New SSE connection request for analysis: ${analysisId}`);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Store this connection
    progressConnections.set(analysisId, res);
    console.log(`✅ SSE connection stored for ${analysisId}. Total connections: ${progressConnections.size}`);

    // Remove connection when client disconnects
    req.on('close', () => {
      console.log(`🔌 SSE connection closed for ${analysisId}`);
      progressConnections.delete(analysisId);
    });

    // Send initial connection confirmation
    const initialMessage = { type: 'connected', message: 'Progress tracking started' };
    console.log(`📨 Sending initial connection message:`, initialMessage);
    res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);
  });
}

// Clean up finished connections
export function cleanupProgressConnection(analysisId: string) {
  const connection = progressConnections.get(analysisId);
  if (connection) {
    try {
      connection.end();
    } catch (error) {
      // Ignore errors when ending connection
    }
    progressConnections.delete(analysisId);
  }
}