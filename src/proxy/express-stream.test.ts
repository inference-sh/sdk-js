/**
 * The express adapter over real sockets: a fake upstream API that streams
 * NDJSON and never ends (like GET /chats/{id}/stream), the proxy in front of
 * it, and a client that reads one event and hangs up. The proxy must cancel
 * its upstream request then; otherwise the upstream stream lives on with
 * nobody reading it and keeps the host process alive.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createHandler, PROXY_ROUTE } from './express';
import { INF_TARGET_HEADER } from './index';

const CHAT = "3amrw0pxz80n2gqrg7xq0m7zxd";

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));
}

describe('express proxy streaming over sockets', () => {
  let upstream: http.Server;
  let proxy: http.Server;
  let upstreamPort: number;
  let proxyPort: number;
  let upstreamClosed: Promise<void>;
  let interval: NodeJS.Timeout | undefined;

  beforeEach(async () => {
    process.env.INFERENCE_API_KEY = 'express-stream-test-key';
    let markClosed!: () => void;
    upstreamClosed = new Promise((resolve) => { markClosed = resolve; });
    upstream = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      res.write(JSON.stringify({ event: 'chats', data: { id: 'c1', status: 'busy' } }) + '\n');
      interval = setInterval(() => res.write(JSON.stringify({ event: 'heartbeat' }) + '\n'), 20);
      res.on('close', () => { clearInterval(interval); markClosed(); });
    });
    upstreamPort = await listen(upstream);

    const app = express();
    app.use(express.json());
    app.all(PROXY_ROUTE, createHandler({ apiUrl: `http://127.0.0.1:${upstreamPort}` }));
    proxy = http.createServer(app);
    proxyPort = await listen(proxy);
  });

  afterEach(async () => {
    clearInterval(interval);
    upstream.closeAllConnections();
    proxy.closeAllConnections();
    await new Promise((r) => upstream.close(r));
    await new Promise((r) => proxy.close(r));
  });

  it('passes the stream through as it arrives', async () => {
    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${proxyPort}${PROXY_ROUTE}`, {
      headers: { [INF_TARGET_HEADER]: `http://127.0.0.1:${upstreamPort}/chats/${CHAT}/stream`, accept: 'application/x-ndjson' },
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    const { value } = await res.body!.getReader().read();
    expect(new TextDecoder().decode(value)).toContain('"status":"busy"');
    controller.abort();
  });

  it('cancels the upstream request when the client disconnects', async () => {
    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${proxyPort}${PROXY_ROUTE}`, {
      headers: { [INF_TARGET_HEADER]: `http://127.0.0.1:${upstreamPort}/chats/${CHAT}/stream`, accept: 'application/x-ndjson' },
      signal: controller.signal,
    });
    await res.body!.getReader().read();
    controller.abort();

    const outcome = await Promise.race([
      upstreamClosed.then(() => 'upstream closed'),
      new Promise((r) => setTimeout(() => r('upstream still open'), 1000)),
    ]);
    expect(outcome).toBe('upstream closed');
  });
});
