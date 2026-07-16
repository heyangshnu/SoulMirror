import {
  CanActivate,
  ExecutionContext,
  GoneException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Blocks legacy bot/followup chain when Archive agent mode is active. */
@Injectable()
export class LegacyChainGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const mode = this.config.get<string>('AGENT_MODE') ?? 'legacy';
    if (mode === 'claude') {
      throw new GoneException(
        'Legacy bot/followup 已退役，请使用 /v1/agent/stream 菩萨对话链路',
      );
    }
    return true;
  }
}
