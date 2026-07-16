import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
    additionalProperties?: boolean;
    [key: string]: unknown;
  };
  handler: ToolHandler;
}

export async function startMcpServer(name: string, version: string, tools: ToolSpec[]) {
  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((item) => item.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    const result = await tool.handler((request.params.arguments ?? {}) as Record<string, unknown>);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function objectSchema(properties: Record<string, object>, required: string[] = []) {
  return {
    type: 'object' as const,
    properties,
    required,
    additionalProperties: true,
  };
}

export function stringProp(description?: string) {
  return { type: 'string', description };
}

export function numberProp(description?: string) {
  return { type: 'number', description };
}

export function jsonProp(description?: string) {
  return { type: 'object', description, additionalProperties: true };
}

export function arrayProp(description?: string) {
  return { type: 'array', description, items: {} };
}

export function asString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

export function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function patchString(value: unknown): string | undefined | null {
  return value === undefined ? undefined : optionalString(value);
}

export function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function patchNumber(value: unknown): number | undefined | null {
  return value === undefined ? undefined : optionalNumber(value);
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
