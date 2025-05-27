import type { Response } from "express";

// Store active SSE connections for progress updates
const progressConnections = new Map<string, Response>();

// Helper function to send SSE message
export function sendProgressUpdate(analysisId: string, data: any) {
  const connection = progressConnections.get(analysisId);
  if (connection && !connection.headersSent) {
    try {
      connection.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Connection may have been closed, remove it
      progressConnections.delete(analysisId);
    }
  }
}

// Setup SSE endpoint
export function setupProgressSSE(app: any) {
  app.get('/api/progress/:analysisId', (req: any, res: Response) => {
    const analysisId = req.params.analysisId;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Store this connection
    progressConnections.set(analysisId, res);

    // Remove connection when client disconnects
    req.on('close', () => {
      progressConnections.delete(analysisId);
    });

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Progress tracking started' })}\n\n`);
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