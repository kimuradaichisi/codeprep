// src/features/repository-context/domain/workingset/RoleAssigner.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRole } from '../ContextRole';

export interface AssignRoleParams {
  readonly path: string;
  readonly nodeKind?: string;
  readonly isSeed?: boolean;
  readonly relations?: readonly string[];
  readonly rank?: number;
}

export class RoleAssigner {
  public static assignRole(params: AssignRoleParams): ContextRole {
    if (this.isExplicitOrSeed(params)) return 'target';
    if (this.isTest(params)) return 'test';
    if (this.isDoc(params.path)) return this.classifyDoc(params.path);
    if (this.isDependency(params)) return 'dependency';
    return 'supporting';
  }

  private static isExplicitOrSeed(p: AssignRoleParams): boolean {
    return Boolean(p.isSeed || (p.rank !== undefined && p.rank <= 1));
  }

  private static isTest(p: AssignRoleParams): boolean {
    if (p.nodeKind === 'test') return true;
    const lower = p.path.toLowerCase();
    return lower.includes('__tests__') || lower.endsWith('.test.ts') || lower.endsWith('.spec.ts');
  }

  private static isDoc(path: string): boolean {
    const lower = path.toLowerCase();
    return lower.endsWith('.md') || lower.includes('/docs/') || lower.startsWith('docs/');
  }

  private static classifyDoc(path: string): ContextRole {
    const lower = path.toLowerCase();
    if (lower.includes('architecture') || lower.includes('design')) return 'architecture';
    if (lower.includes('spec') || lower.includes('requirements')) return 'specification';
    return 'supporting';
  }

  private static isDependency(p: AssignRoleParams): boolean {
    if (!p.relations || p.relations.length === 0) return false;
    const depRels = ['DEPENDS_ON', 'REFERENCES', 'IMPLEMENTS', 'BINDS_TO', 'INJECTS'];
    return p.relations.some((r) => depRels.includes(r));
  }
}
