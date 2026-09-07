// evaluation/kairos-exploration/taskDefinition.ts
import type { KairosCondition } from './types';

export const TASK_01_ID = 'TASK-01';

const BASE_TASK_DESCRIPTION = `Project KAIROS の現在のRepositoryを調査し、日次運用から翌営業日の売買準備・実取引記録までの実際の処理経路を復元してください。
コードは変更しないでください。
過去の設計書や運用ドキュメントをそのまま正解とせず、現在のソースコードを最終Evidenceとして判断してください。

【調査必須項目】
A. Entry Points
- CLI, scheduler, API, startup, individual usecase direct execution
- file, symbol, caller, callee, role を明らかにしてください。

B. Daily Flow
- Data Ingestion, Market Environment, Screening, Signal Check, Trade Setup, Paper Trading, Real Trading, Portfolio / PnL, Notification の接続関係を復元してください。

C. Market Safety / MMTW
- MMTW calculation, threshold definition, Kill Switch が Screening, Signal Check, Trade Setup, Paper Trading, Real Trading の各経路で実際に適用されているか検証してください。

D. Real Trading Semantics
- Trade Setup ≠ broker order execution
- LINE notification ≠ broker API
- real_pnl buy/sell ≠ order submission
実注文が自動化されているか、人間操作なのかをEvidenceで判断してください。

E. Documentation Drift
- strategy rules, operational manual, business flow, system architecture, use case docs と現行実装を比較し、Claim / Implementation / Difference / Evidence を整理してください。`;

const CODEPREP_INSTRUCTION = `Use the CodePrep MCP tool 'codeprep_prepare_context' before manual exploration.
Review the discovered candidates and structural evidence.
If confidence is HIGH, it provides complete source files.
If confidence is MEDIUM or LOW, you can select key entry points and call 'codeprep_build_context_pack'.
You may perform additional repository exploration if necessary, but avoid redundant manual file reads on files already packaged.`;

export function buildKairosPrompt(condition: KairosCondition): string {
  if (condition === 'sonnet-codeprep') {
    return `${BASE_TASK_DESCRIPTION}\n\n【Context Tool Instruction】\n${CODEPREP_INSTRUCTION}`;
  }
  return BASE_TASK_DESCRIPTION;
}
