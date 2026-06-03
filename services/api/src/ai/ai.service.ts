import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class AiService {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(AiService.name);

  constructor(private config: ConfigService) {
    const baseURL =
      this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8001';
    this.client = axios.create({ baseURL, timeout: 120000 });
  }

  async get<T>(path: string): Promise<T> {
    try {
      const res = await this.client.get<T>(path);
      return res.data;
    } catch (err) {
      this.logger.error(`AI service error GET ${path}`, err);
      throw err;
    }
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    try {
      const res = await this.client.post<T>(path, data);
      return res.data;
    } catch (err) {
      this.logger.error(`AI service error POST ${path}`, err);
      throw err;
    }
  }

  streamPost(path: string, data: unknown): Promise<NodeJS.ReadableStream> {
    return this.client
      .post(path, data, { responseType: 'stream', timeout: 0 })
      .then((res) => res.data as NodeJS.ReadableStream)
      .catch((err) => {
        this.logger.error(`AI service stream error POST ${path}`, err);
        throw err;
      });
  }
}
