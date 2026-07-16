import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface BasicMemoryRuntimeEnv {
  configDir: string;
  home: string;
  fastembedCachePath: string;
}

export interface ClaudeCodeTurnInput {
  slug: string;
  runId: string;
  agent: string;
  sessionKey?: string;
  message: string;
  provider: ClaudeCodeProviderProfile;
  sessionMode: 'persistent' | 'stateless';
  runtimeRoot: string;
  basicMemory: BasicMemoryRuntimeEnv;
  timeoutMs?: number;
}

export interface ClaudeCodeProviderProfile {
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

export interface ClaudeCodeEventSink {
  onEvent(event: unknown): void;
  onText(text: string): void;
  onError(error: Error): void;
  onDone(summary: {
    localRunId: string;
    sessionId?: string;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    stdoutPath: string;
    stderrPath: string;
  }): void;
}

export class ClaudeCodeRunner {
  private readonly claudeBin = process.env.CLAUDE_CODE_BIN || 'claude';
  private readonly projectRoot = path.resolve(process.env.FATE_AND_FORTUNE_ROOT || process.cwd());
  private readonly agentSoulRoot = path.resolve(process.env.AGENT_SOUL_ROOT || path.join(this.projectRoot, 'agents'));

  async sendTurn(
    input: ClaudeCodeTurnInput,
    sink: ClaudeCodeEventSink,
    options?: { skipResume?: boolean; resumeRetried?: boolean },
  ) {
    const localRunId = randomUUID();
    const workspace = await this.ensureWorkspace(input.runtimeRoot, input.slug, input.runId, input.agent, localRunId);
    const sessionHandleKey = `${input.slug}:${input.sessionKey ?? input.agent}`;
    const stateRoot = path.join(input.runtimeRoot, 'claude-code', 'state', this.pathKey(sessionHandleKey));
    await mkdir(stateRoot, { recursive: true });

    const promptPath = path.join(workspace, 'prompt.md');
    const mcpConfigPath = path.join(workspace, 'mcp.json');
    const stdoutPath = path.join(workspace, 'events.jsonl');
    const stderrPath = path.join(workspace, 'stderr.log');
    const prompt = await this.buildPrompt(input.agent, input.message);
    await writeFile(promptPath, prompt, 'utf8');
    await writeFile(mcpConfigPath, JSON.stringify(this.buildMcpConfig(input), null, 2), 'utf8');
    const resumeSessionId =
      !options?.skipResume && input.sessionMode === 'persistent'
        ? await this.readSessionHandle(input.runtimeRoot, sessionHandleKey)
        : undefined;

    const eventsLog = createWriteStream(stdoutPath, { flags: 'a' });
    const stderrLog = createWriteStream(stderrPath, { flags: 'a' });
    eventsLog.on('error', (error) => sink.onError(error));
    stderrLog.on('error', (error) => sink.onError(error));

    const args = [
      '-p',
      '--output-format',
      'stream-json',
      '--verbose',
      '--mcp-config',
      mcpConfigPath,
      '--strict-mcp-config',
      '--add-dir',
      this.projectRoot,
      '--permission-mode',
      'bypassPermissions',
      '--disallowedTools',
      'Bash,Edit,Glob,Grep,TodoWrite,WebFetch,Task',
      '--model',
      input.provider.model,
    ];
    if (process.env.CLAUDE_CODE_USE_BARE === '1') args.unshift('--bare');
    if (input.sessionMode === 'stateless' && process.env.CLAUDE_CODE_SUPPORTS_NO_SESSION_PERSISTENCE === '1') args.push('--no-session-persistence');
    if (input.sessionMode === 'persistent' && resumeSessionId) args.push('--resume', resumeSessionId);
    if (process.env.CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES === '1') args.push('--include-partial-messages');

    const child = spawn(this.claudeBin, args, {
      cwd: this.projectRoot,
      env: {
        ...process.env,
        FATE_AND_FORTUNE_ROOT: this.projectRoot,
        METHODOLOGY_ROOT: process.env.METHODOLOGY_ROOT || path.join(this.projectRoot, 'methodology'),
        HOME: process.env.HOME || path.join(input.runtimeRoot, 'home'),
        TMPDIR: process.env.TMPDIR || path.join(input.runtimeRoot, 'tmp'),
        XDG_DATA_HOME: path.join(stateRoot, 'data'),
        XDG_CONFIG_HOME: path.join(stateRoot, 'config'),
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || path.join(input.runtimeRoot, 'cache'),
        BUN_INSTALL_CACHE_DIR: process.env.BUN_INSTALL_CACHE_DIR || path.join(input.runtimeRoot, 'cache', 'bun-install'),
        NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || path.join(input.runtimeRoot, 'cache', 'npm'),
        npm_config_cache: process.env.npm_config_cache || path.join(input.runtimeRoot, 'cache', 'npm'),
        BASIC_MEMORY_CONFIG_DIR: input.basicMemory.configDir,
        BASIC_MEMORY_HOME: input.basicMemory.home,
        BASIC_MEMORY_LOG_LEVEL: process.env.BASIC_MEMORY_LOG_LEVEL || 'WARNING',
        FASTEMBED_CACHE_PATH: input.basicMemory.fastembedCachePath,
        ANTHROPIC_API_KEY: input.provider.apiKey,
        ANTHROPIC_AUTH_TOKEN: input.provider.apiKey,
        ANTHROPIC_BASE_URL: input.provider.baseUrl,
        CLAUDE_CODE_ENABLE_TELEMETRY: '0',
        DISABLE_TELEMETRY: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });

    const killChild = (signal: NodeJS.Signals) => {
      try {
        if (process.platform === 'win32' || child.pid === undefined) child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ESRCH') sink.onError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const timeoutMs = input.timeoutMs && input.timeoutMs > 0 ? input.timeoutMs : 0;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let killTimer: NodeJS.Timeout | undefined;
    if (timeoutMs) {
      timeoutTimer = setTimeout(() => {
        const message = `Claude Code timed out after ${timeoutMs}ms for ${input.agent}.`;
        stderrLog.write(`\n${message}\n`);
        sink.onError(new Error(message));
        killChild('SIGTERM');
        killTimer = setTimeout(() => killChild('SIGKILL'), 10_000);
        killTimer.unref?.();
      }, timeoutMs);
      timeoutTimer.unref?.();
    }

    child.stdin.on('error', (error) => sink.onError(error));
    child.stdin.end(prompt);

    let sessionId: string | undefined;
    let finalResultText = '';
    let stdoutBuffer = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk;
      let newline = stdoutBuffer.indexOf('\n');
      while (newline >= 0) {
        const line = stdoutBuffer.slice(0, newline).trim();
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        if (line) {
          eventsLog.write(`${line}\n`);
          const parsed = this.parseEventLine(line);
          if (parsed) {
            sessionId = this.extractSessionId(parsed) ?? sessionId;
            const resultText = this.extractResultText(parsed);
            if (resultText) {
              finalResultText = resultText;
              sink.onText(resultText);
            } else if (process.env.CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES === '1') {
              const partial = this.extractAssistantText(parsed);
              if (partial) sink.onText(partial);
            }
            sink.onEvent(parsed);
          }
        }
        newline = stdoutBuffer.indexOf('\n');
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderrLog.write(chunk);
    });

    child.on('error', (error) => {
      sink.onError(error);
    });

    child.on('close', (exitCode, signal) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      if (stdoutBuffer.trim()) {
        eventsLog.write(`${stdoutBuffer.trim()}\n`);
        const parsed = this.parseEventLine(stdoutBuffer.trim());
        if (parsed) {
          sessionId = this.extractSessionId(parsed) ?? sessionId;
          const resultText = this.extractResultText(parsed);
          if (resultText && resultText !== finalResultText) sink.onText(resultText);
          sink.onEvent(parsed);
        }
      }
      eventsLog.end();
      stderrLog.end();
      void (async () => {
        if (
          exitCode &&
          exitCode !== 0 &&
          resumeSessionId &&
          !options?.resumeRetried
        ) {
          const stderr = await readFile(stderrPath, 'utf8').catch(() => '');
          if (/No conversation found with session ID/i.test(stderr)) {
            await this.clearSessionHandle(input.runtimeRoot, sessionHandleKey);
            await this.sendTurn(input, sink, { skipResume: true, resumeRetried: true });
            return;
          }
        }
        if (input.sessionMode === 'persistent' && sessionId) {
          await this.writeSessionHandle(input.runtimeRoot, sessionHandleKey, sessionId);
        }
        sink.onDone({ localRunId, sessionId, exitCode, signal, stdoutPath, stderrPath });
      })().catch((error: unknown) => {
        sink.onError(error instanceof Error ? error : new Error(String(error)));
        sink.onDone({ localRunId, sessionId, exitCode, signal, stdoutPath, stderrPath });
      });
    });

    return {
      localRunId,
      stop: () => {
        killChild('SIGTERM');
      },
    };
  }

  private async ensureWorkspace(root: string, slug: string, runId: string, agent: string, localRunId: string) {
    const workspace = path.join(root, 'runs', slug, runId, 'claude-code', agent, localRunId);
    await mkdir(workspace, { recursive: true });
    return workspace;
  }

  private pathKey(value: string) {
    return Buffer.from(value).toString('base64url');
  }

  private async buildPrompt(agent: string, message: string) {
    const soulPath = path.join(this.agentSoulRoot, `${agent}.md`);
    let soul = '';
    try {
      soul = await readFile(soulPath, 'utf8');
    } catch {
      soul = `# ${agent}\n\nNo separate agent soul file was found. Follow the task prompt exactly.`;
    }
    return [
      '# Claude Code Runtime Contract',
      '',
      'You are executing a single auditable SoulZen agent stage inside fate-and-fortune.',
      'Follow the Agent SOUL below as highest-priority role instructions for this run.',
      'Use MCP tools for person memory and methodology. Do not use built-in filesystem tools for person memory.',
      'Return exactly the protocol blocks requested by the task prompt.',
      '',
      '# Agent SOUL',
      '',
      soul,
      '',
      '# Stage Prompt',
      '',
      message,
    ].join('\n');
  }

  private buildMcpConfig(input: ClaudeCodeTurnInput) {
    const isProduction = process.env.NODE_ENV === 'production';
    const memoryScript = isProduction ? 'mcp:memory' : 'mcp:memory:dev';
    const methodologyScript = isProduction ? 'mcp:methodology' : 'mcp:methodology:dev';
    return {
      mcpServers: {
        fate_memory: {
          command: 'npm',
          args: ['--prefix', this.projectRoot, 'run', memoryScript],
          env: {
            BASIC_MEMORY_CONFIG_DIR: input.basicMemory.configDir,
            BASIC_MEMORY_HOME: input.basicMemory.home,
            BASIC_MEMORY_LOG_LEVEL: process.env.BASIC_MEMORY_LOG_LEVEL || 'WARNING',
            FASTEMBED_CACHE_PATH: input.basicMemory.fastembedCachePath,
          },
        },
        fate_methodology: {
          command: 'npm',
          args: ['--prefix', this.projectRoot, 'run', methodologyScript],
          env: {
            METHODOLOGY_ROOT: process.env.METHODOLOGY_ROOT || path.join(this.projectRoot, 'methodology'),
          },
        },
      },
    };
  }

  private parseEventLine(line: string) {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private extractSessionId(event: unknown): string | undefined {
    if (!event || typeof event !== 'object') return undefined;
    const candidate = event as Record<string, unknown>;
    if (typeof candidate.session_id === 'string') return candidate.session_id;
    if (typeof candidate.sessionId === 'string') return candidate.sessionId;
    return undefined;
  }

  private extractResultText(event: unknown): string {
    if (!event || typeof event !== 'object') return '';
    const candidate = event as Record<string, unknown>;
    if (candidate.type === 'result' && typeof candidate.result === 'string') return candidate.result;
    return '';
  }

  private extractAssistantText(event: unknown): string {
    if (!event || typeof event !== 'object') return '';
    const candidate = event as Record<string, unknown>;
    if (candidate.type !== 'assistant') return '';
    const message = candidate.message;
    if (!message || typeof message !== 'object') return '';
    const content = (message as Record<string, unknown>).content;
    if (!Array.isArray(content)) return '';
    return content
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const block = item as Record<string, unknown>;
        return block.type === 'text' && typeof block.text === 'string' ? block.text : '';
      })
      .join('');
  }

  private async readSessionHandle(runtimeRoot: string, key: string): Promise<string | undefined> {
    try {
      const raw = await readFile(this.sessionHandlesPath(runtimeRoot), 'utf8');
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed[key];
    } catch {
      return undefined;
    }
  }

  private async writeSessionHandle(runtimeRoot: string, key: string, sessionId: string) {
    const file = this.sessionHandlesPath(runtimeRoot);
    await mkdir(path.dirname(file), { recursive: true });
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(await readFile(file, 'utf8')) as Record<string, string>;
    } catch {
      parsed = {};
    }
    parsed[key] = sessionId;
    await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  }

  private async clearSessionHandle(runtimeRoot: string, key: string) {
    const file = this.sessionHandlesPath(runtimeRoot);
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Record<string, string>;
      if (!(key in parsed)) return;
      delete parsed[key];
      await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    } catch {
      /* ignore missing handle file */
    }
  }

  private sessionHandlesPath(runtimeRoot: string) {
    return path.join(runtimeRoot, 'claude-code', 'session-handles.json');
  }
}
