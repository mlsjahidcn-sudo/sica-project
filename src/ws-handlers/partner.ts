/**
 * WebSocket Partner Handler
 * Handles real-time updates for partner portal
 */

import { WebSocket, type WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';

// Store connected clients by team_id (partner admin user_id)
const teamClients = new Map<string, Set<WebSocket>>();

// Track team_id and user_id for each websocket
const wsToTeam = new WeakMap<WebSocket, { teamId: string; userId: string; role: string }>();

// Rate limiting for WebSocket messages
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const messageRateLimits = new Map<string, RateLimitRecord>();

// WebSocket rate limit config: 50 messages per minute per client
const WS_RATE_LIMIT = {
  maxMessages: 50,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Check rate limit for a WebSocket client
 */
function checkWSRateLimit(clientId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = messageRateLimits.get(clientId);

  if (!record || now > record.resetTime) {
    // New window
    messageRateLimits.set(clientId, {
      count: 1,
      resetTime: now + WS_RATE_LIMIT.windowMs,
    });
    return { allowed: true, remaining: WS_RATE_LIMIT.maxMessages - 1 };
  }

  if (record.count >= WS_RATE_LIMIT.maxMessages) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: WS_RATE_LIMIT.maxMessages - record.count };
}

// Cleanup old rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of messageRateLimits.entries()) {
    if (now > record.resetTime) {
      messageRateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface PartnerMessage {
  type: 'auth' | 'team_activity' | 'student_update' | 'application_update' | 'document_update';
  userId?: string;
  teamId?: string;
  role?: string;
  payload?: {
    action: string;
    entityId?: string;
    actorId?: string;
    actorName?: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Setup the partner WebSocket handler
 */
export function setupPartnerHandler(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    let alive = true;
    
    // Heartbeat to detect dead connections
    const heartbeatInterval = setInterval(() => {
      if (!alive) {
        ws.terminate();
        return;
      }
      alive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      alive = true;
    });

    // Generate a unique client ID for rate limiting (based on connection time and remote address)
    const clientId = `${req.socket.remoteAddress || 'unknown'}-${Date.now()}`;

    ws.on('message', (raw: Buffer) => {
      try {
        // Check rate limit for this client
        const rateLimitResult = checkWSRateLimit(clientId);
        if (!rateLimitResult.allowed) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            payload: { message: 'Rate limit exceeded. Too many messages.' } 
          }));
          return;
        }

        const msg: PartnerMessage = JSON.parse(raw.toString());
        
        // Handle authentication
        if (msg.type === 'auth') {
          const { userId, teamId, role } = msg;
          
          if (!userId || !teamId) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Missing auth fields' }));
            return;
          }
          
          // Store the mapping
          wsToTeam.set(ws, { teamId, userId, role: role || 'member' });
          
          // Add to team clients
          if (!teamClients.has(teamId)) {
            teamClients.set(teamId, new Set());
          }
          teamClients.get(teamId)!.add(ws);
          
          console.log(`[WS Partner] User ${userId} connected to team ${teamId}`);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'auth:confirmed',
            payload: { userId, teamId }
          }));
          return;
        }

        // Handle team broadcasts (only admins can broadcast)
        if (['team_activity', 'student_update', 'application_update', 'document_update'].includes(msg.type)) {
          const clientInfo = wsToTeam.get(ws);
          
          if (!clientInfo) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Not authenticated' }));
            return;
          }
          
          // Broadcast to all team members
          broadcastToTeam(clientInfo.teamId, msg);
        }
      } catch (error) {
        console.error('[WS Partner] Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      clearInterval(heartbeatInterval);
      
      // Clean up team mapping
      const clientInfo = wsToTeam.get(ws);
      if (clientInfo) {
        const clients = teamClients.get(clientInfo.teamId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            teamClients.delete(clientInfo.teamId);
          }
        }
        wsToTeam.delete(ws);
        console.log(`[WS Partner] User ${clientInfo.userId} disconnected from team ${clientInfo.teamId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('[WS Partner] WebSocket error:', error);
      clearInterval(heartbeatInterval);
    });
  });
}

/**
 * Broadcast a message to all members of a team
 */
export function broadcastToTeam(teamId: string, message: PartnerMessage): void {
  const clients = teamClients.get(teamId);
  if (!clients) return;

  const msgStr = JSON.stringify(message);
  
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msgStr);
    }
  });
}

/**
 * Send a message to a specific user in a team
 */
export function sendToTeamUser(teamId: string, userId: string, message: PartnerMessage): boolean {
  const clients = teamClients.get(teamId);
  if (!clients) return false;

  const msgStr = JSON.stringify(message);
  let sent = false;
  
  clients.forEach((ws) => {
    const clientInfo = wsToTeam.get(ws);
    if (clientInfo?.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(msgStr);
      sent = true;
    }
  });

  return sent;
}

/**
 * Get connected team members count
 */
export function getTeamMembersCount(teamId: string): number {
  return teamClients.get(teamId)?.size || 0;
}
