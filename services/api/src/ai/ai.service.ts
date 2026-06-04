import { Inject, Injectable, Logger, Scope, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import axios, { AxiosInstance } from 'axios';
import type { Request } from 'express';
import { parseRequestLocale, type AppLocale } from '../common/locale';

@Injectable({ scope: Scope.REQUEST })
export class AiService {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private config: ConfigService,
    @Inject(REQUEST) private readonly req: Request,
  ) {
    const baseURL = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8001';
    this.client = axios.create({ baseURL, timeout: 300000 });
  }

  get locale(): AppLocale {
    return parseRequestLocale(this.req.headers);
  }

  private withLocale(data: unknown): Record<string, unknown> {
    const locale = this.locale;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return { ...(data as Record<string, unknown>), locale };
    }
    return { locale, data };
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    try {
      const res = await this.client.get<T>(path, {
        params: { ...params, locale: this.locale },
      });
      return res.data;
    } catch (err) {
      this.logger.error(`AI service error GET ${path}`, err);
      throw err;
    }
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    try {
      const res = await this.client.post<T>(path, this.withLocale(data));
      return res.data;
    } catch (err) {
      this.logger.error(`AI service error POST ${path}`, err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          throw new ServiceUnavailableException('AI 服务未启动，请稍后重试');
        }
        const detail =
          typeof err.response?.data === 'object' && err.response?.data !== null
            ? JSON.stringify(err.response.data).slice(0, 200)
            : err.message;
        throw new ServiceUnavailableException(`AI 服务异常：${detail}`);
      }
      throw new ServiceUnavailableException('报告生成失败，请稍后重试');
    }
  }

  streamPost(path: string, data: unknown): Promise<NodeJS.ReadableStream> {
    return this.client
      .post(path, this.withLocale(data), { responseType: 'stream', timeout: 0 })
      .then((res) => res.data as NodeJS.ReadableStream)
      .catch((err) => {
        this.logger.error(`AI service stream error POST ${path}`, err);
        throw err;
      });
  }
}
