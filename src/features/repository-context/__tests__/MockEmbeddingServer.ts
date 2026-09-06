import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { FakeEmbeddingPort } from '../infrastructure/embedding/FakeEmbeddingPort';

export interface RunningEmbeddingServer {
  readonly server: Server;
  readonly endpoint: string;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of req) {
    body += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }
  return body;
}

async function handleEmbed(req: IncomingMessage, res: ServerResponse, port: FakeEmbeddingPort): Promise<void> {
  const body = await readBody(req);
  const parsed = JSON.parse(body) as { input?: unknown };
  const inputs = Array.isArray(parsed.input) ? parsed.input.map(String) : [String(parsed.input ?? '')];
  const vectors = await port.embed(inputs);
  const embeddings = vectors.map((v) => Array.from(v));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ embeddings }));
}

function createEmbedListener(port: FakeEmbeddingPort) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method === 'POST' && req.url === '/api/embed') {
      await handleEmbed(req, res, port);
      return;
    }
    res.writeHead(404);
    res.end();
  };
}

export async function startMockEmbeddingServer(dimensions = 16): Promise<RunningEmbeddingServer> {
  const fakePort = new FakeEmbeddingPort({ dimensions });
  const server = createServer(createEmbedListener(fakePort));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { server, endpoint: `http://127.0.0.1:${port}` };
}
