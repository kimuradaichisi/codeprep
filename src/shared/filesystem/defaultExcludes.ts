// src/shared/filesystem/defaultExcludes.ts

export const DEFAULT_EXCLUDED_DIR_NAMES = Object.freeze([
  '.git',
  'node_modules',
  'dist',
  'out',
  '.next',
  'build',
  '.venv',
  'venv',
  'coverage',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.turbo',
  '.nuxt',
  '.cache',
] as const);

export const SENSITIVE_EXCLUDED_PATTERNS = Object.freeze([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  'id_rsa',
  'id_ed25519',
] as const);

export const DEFAULT_EXCLUDED_PATTERNS = Object.freeze([
  ...DEFAULT_EXCLUDED_DIR_NAMES.map((name) => `${name}/`),
  ...SENSITIVE_EXCLUDED_PATTERNS,
]);
