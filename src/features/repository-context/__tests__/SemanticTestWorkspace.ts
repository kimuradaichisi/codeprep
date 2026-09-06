import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Project } from '../domain/Project';
import type { RepositoryIndex } from '../domain/RepositoryIndex';
import { BuildStructuredKnowledgeIndexUseCase } from '../application/BuildStructuredKnowledgeIndexUseCase';
import { KnowledgeExtractionService } from '../application/KnowledgeExtractionService';
import { TypeScriptSymbolExtractor } from '../infrastructure/code/TypeScriptSymbolExtractor';
import { JsonStructuredKnowledgeIndexStore } from '../infrastructure/filesystem/JsonStructuredKnowledgeIndexStore';
import { NodeFsKnowledgeFileReader } from '../infrastructure/filesystem/NodeFsKnowledgeFileReader';
import { MarkdownSectionExtractor } from '../infrastructure/markdown/MarkdownSectionExtractor';

export const ORDER_SERVICE_CODE = [
  'export class OrderService {',
  '  /** Prevents duplicate refunds. */',
  '  refund(orderId: string): Promise<void> { return Promise.resolve(); }',
  '}',
].join('\n');

export const REFUND_MD = [
  '# Order',
  '## Refund',
  '### Duplicate Prevention',
  'A refund must not be applied twice.',
].join('\n');

const DIRS = [
  'src/order', 'docs/order', 'src/billing', 'src/auth',
  'src/user', 'docs/auth', 'docs/billing', 'config',
];

const SOURCE_FILES = [
  ['src/order/OrderService.ts', ORDER_SERVICE_CODE],
  ['docs/order/refund.md', REFUND_MD],
  ['src/order/ReturnPolicy.ts', 'export class ReturnPolicy { canReturn() {} }'],
  ['src/billing/PaymentGateway.ts', 'export class PaymentGateway { processPayment() {} refundPayment() {} }'],
  ['src/auth/AuthTokenManager.ts', 'export class AuthTokenManager { refreshToken() {} verifyToken() {} }'],
  ['src/user/UserProfileService.ts', 'export class UserProfileService { updateAvatar() {} changeEmail() {} }'],
  ['docs/order/return_guide.md', '# Returns\n## Policy\n### Shipping Label\nPrint shipping label.'],
  ['docs/auth/jwt_flow.md', '# Authentication\n## Token Refresh\n### Expiration\nJWT token flow.'],
  ['docs/billing/stripe_setup.md', '# Billing\n## Stripe\n### Webhook Handling\nWebhook events.'],
  ['config/app.json', '{\n  "port": 3000,\n  "timeout": 5000\n}'],
] as const;

async function createDirs(root: string): Promise<void> {
  for (const d of DIRS) {
    await mkdir(join(root, d), { recursive: true });
  }
}

async function writeSourceFiles(root: string): Promise<void> {
  for (const [path, content] of SOURCE_FILES) {
    await writeFile(join(root, path), content, 'utf8');
  }
}

export async function populateRepository(root: string): Promise<void> {
  await createDirs(root);
  await writeSourceFiles(root);
}

export async function buildKnowledgeIndex(root: string, storeDir: string, project: Project) {
  const store = new JsonStructuredKnowledgeIndexStore(storeDir);
  const reader = new NodeFsKnowledgeFileReader(() => root);
  const service = new KnowledgeExtractionService(new MarkdownSectionExtractor(), new TypeScriptSymbolExtractor(), reader);
  const builder = new BuildStructuredKnowledgeIndexUseCase(service, store);
  const repoIndex: RepositoryIndex = {
    metadata: { workspaceId: project.id, schemaVersion: 1, createdAt: '', updatedAt: '' },
    entries: [
      'src/order/OrderService.ts', 'docs/order/refund.md', 'src/order/ReturnPolicy.ts',
      'src/billing/PaymentGateway.ts', 'src/auth/AuthTokenManager.ts', 'src/user/UserProfileService.ts',
      'docs/order/return_guide.md', 'docs/auth/jwt_flow.md', 'docs/billing/stripe_setup.md', 'config/app.json',
    ].map((path) => ({ projectId: project.id, relativePath: path, kind: path.endsWith('.md') ? 'document' : 'code', size: 100, contentHash: 'h' })),
  };
  return builder.execute(repoIndex);
}
