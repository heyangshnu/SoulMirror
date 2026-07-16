import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AgentWsProxy } from './agent/agent-ws.proxy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const wsProxy = app.get(AgentWsProxy);
  wsProxy.attach(app.getHttpServer());

  console.log(`SoulMirror API listening on http://localhost:${port}/v1`);
  console.log(`Agent WSS proxy: ws://localhost:${port}/v1/agent/stream?token=...`);
}
bootstrap();
