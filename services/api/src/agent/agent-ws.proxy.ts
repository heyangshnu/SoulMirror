import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { FUXI_INIT_NODES, agentHostWsUrl, userSlug } from './agent.constants';
import { UsersService } from '../users/users.service';

function normalizeUpstreamEvent(raw: Record<string, unknown>): Record<string, unknown> {
  const type = String(raw.type ?? '');

  if (type === 'agent_text_delta' && typeof raw.text === 'string') {
    return { type: 'delta', text: raw.text, at: raw.at };
  }
  if (type === 'assistant_message' && typeof raw.text === 'string') {
    return { type: 'done', fullText: raw.text, turnId: raw.turnId, at: raw.at };
  }
  if (type === 'turn_done') {
    return { type: 'done', turnId: raw.turnId, at: raw.at };
  }
  if (type === 'turn_failed') {
    return {
      type: 'error',
      message: String(raw.message ?? '对话失败，请稍后重试'),
      turnId: raw.turnId,
      at: raw.at,
    };
  }
  if (type === 'agent_error') {
    return {
      type: 'error',
      message: String(raw.message ?? 'agent 执行失败'),
      at: raw.at,
    };
  }
  if (type === 'fuxi_node_done' || type === 'fuxi_node_reused') {
    const code = String(raw.nodeCode ?? raw.code ?? '');
    const idx = FUXI_INIT_NODES.findIndex((n) => n.code === code);
    return {
      type: 'init_progress',
      node: code,
      nodeName: raw.nodeName,
      done: idx >= 0 ? idx + 1 : undefined,
      total: FUXI_INIT_NODES.length,
      at: raw.at,
    };
  }
  if (type === 'fuxi_init_done') {
    return { type: 'init_done', total: raw.total, failed: raw.failed, at: raw.at };
  }
  if (type === 'fuxi_init_chat_ready') {
    return {
      type: 'init_chat_ready',
      coreDone: raw.coreDone,
      total: raw.total,
      at: raw.at,
    };
  }
  if (type === 'fuxi_init_partial') {
    return { type: 'init_partial', error: raw.message ?? type, failed: raw.failed, at: raw.at };
  }
  if (type === 'fuxi_init_failed' || type === 'fuxi_init_aborted') {
    return { type: 'init_failed', error: raw.message ?? type, at: raw.at };
  }
  if (type === 'gongcao_batch_started' || type === 'luohan_batch_started') {
    return { type: 'background', status: 'gongcao_running', at: raw.at };
  }
  if (type === 'background_idle') {
    return { type: 'background', status: 'memory_updated', at: raw.at };
  }
  return raw;
}

function translateClientMessage(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.type === 'user_message' && typeof raw.text === 'string') {
    return { type: 'message', text: raw.text };
  }
  return raw;
}

@Injectable()
export class AgentWsProxy {
  private readonly logger = new Logger(AgentWsProxy.name);
  private attached = false;

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  attach(httpServer: Server) {
    if (this.attached) return;
    this.attached = true;

    const wss = new WebSocketServer({ noServer: true });
    const agentHostUrl = this.config.get<string>('AGENT_HOST_URL') ?? 'http://127.0.0.1:8787';
    const path = '/v1/agent/stream';

    httpServer.on('upgrade', async (req, socket, head) => {
      try {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname !== path) return;

        const token = url.searchParams.get('token');
        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        let userId: string;
        try {
          const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
          const user = await this.usersService.findById(payload.sub);
          if (!user) throw new UnauthorizedException();
          userId = user._id.toString();
        } catch {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (clientWs) => {
          const slug = userSlug(userId);
          const upstreamUrl = agentHostWsUrl(agentHostUrl, slug);
          const upstream = new WebSocket(upstreamUrl);
          const pendingClientMessages: Buffer[] = [];

          const forwardToUpstream = (data: WebSocket.RawData) => {
            if (upstream.readyState !== WebSocket.OPEN) return;
            try {
              const parsed = JSON.parse(String(data)) as Record<string, unknown>;
              upstream.send(JSON.stringify(translateClientMessage(parsed)));
            } catch {
              upstream.send(data);
            }
          };

          clientWs.on('message', (data) => {
            if (upstream.readyState === WebSocket.OPEN) {
              forwardToUpstream(data);
              return;
            }
            pendingClientMessages.push(Buffer.from(data as Buffer));
          });

          const closeBoth = (reason?: string) => {
            if (reason) this.logger.debug(`ws proxy close ${slug}: ${reason}`);
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
            if (upstream.readyState === WebSocket.OPEN) upstream.close();
          };

          upstream.on('open', () => {
            for (const data of pendingClientMessages) forwardToUpstream(data);
            pendingClientMessages.length = 0;

            upstream.on('message', (data) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;
              try {
                const parsed = JSON.parse(String(data)) as Record<string, unknown>;
                clientWs.send(JSON.stringify(normalizeUpstreamEvent(parsed)));
              } catch {
                clientWs.send(data);
              }
            });
          });

          upstream.on('error', (err) => {
            this.logger.warn(`upstream ws error ${slug}: ${err.message}`);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', message: 'agent-host connection failed' }));
            }
            closeBoth('upstream error');
          });

          clientWs.on('error', (err) => {
            this.logger.warn(`client ws error ${slug}: ${err.message}`);
            closeBoth('client error');
          });

          clientWs.on('close', () => closeBoth('client closed'));
          upstream.on('close', () => closeBoth('upstream closed'));
        });
      } catch (err) {
        this.logger.error(`ws upgrade failed: ${String(err)}`);
        socket.destroy();
      }
    });

    this.logger.log(`WSS proxy attached at ${path} → agent-host /ws (normalized events)`);
  }
}
