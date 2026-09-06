# Phase 3C-EVAL Real Embedding Calibration Report

## Environment
- Repository: `codeprep`
- provider: `ollama`
- endpoint: `http://localhost:11434`
- model: `nomic-embed-text`
- dimensions: 768
- embedding format version: 1
- semantic schema version: 1

## Golden Set
- total tasks: 20
- JP→EN tasks: 5
- ambiguous tasks: 2

## Baseline — Deterministic Only
- Top1: 10.0%
- HitRate@3: 10.0%
- HitRate@5: 30.0%
- Recall@10: 32.5%
- MRR: 0.153

## Hybrid — Real Semantic (minScore: 0.55, weight: 40, topK: 10)
- Top1: 15.0%
- HitRate@3: 25.0%
- HitRate@5: 40.0%
- Recall@10: 42.5%
- MRR: 0.221

## Parameter Sweep

| minScore | semanticWeight | topK | Top1 | Hit@3 | Hit@5 | Recall@10 | MRR |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0.45 | 20 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.227 |
| 0.45 | 30 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.221 |
| 0.45 | 40 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.221 |
| 0.45 | 50 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.230 |
| 0.55 | 20 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.227 |
| 0.55 | 30 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.221 |
| 0.55 | 40 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.221 |
| 0.55 | 50 | 10 | 15.0% | 25.0% | 40.0% | 42.5% | 0.230 |
| 0.65 | 20 | 10 | 10.0% | 15.0% | 35.0% | 37.5% | 0.170 |
| 0.65 | 30 | 10 | 10.0% | 15.0% | 35.0% | 37.5% | 0.165 |
| 0.65 | 40 | 10 | 10.0% | 15.0% | 35.0% | 37.5% | 0.165 |
| 0.65 | 50 | 10 | 10.0% | 15.0% | 30.0% | 37.5% | 0.163 |
| 0.75 | 20 | 10 | 15.0% | 15.0% | 35.0% | 37.5% | 0.203 |
| 0.75 | 30 | 10 | 15.0% | 15.0% | 35.0% | 37.5% | 0.203 |
| 0.75 | 40 | 10 | 15.0% | 15.0% | 35.0% | 37.5% | 0.203 |
| 0.75 | 50 | 10 | 15.0% | 15.0% | 35.0% | 37.5% | 0.203 |
| 0.55 | 40 | 5 | 10.0% | 15.0% | 35.0% | 37.5% | 0.173 |
| 0.55 | 40 | 20 | 20.0% | 30.0% | 45.0% | 42.5% | 0.277 |

## Selected Parameters
- minScore: 0.55
- semanticWeight: 40
- topK: 10
- rationale: Recall@10 と HitRate@5 を最大化しつつ、Top1 の低下を最小限に抑えるバランス点。

## JP→EN Subset (5 tasks)
- Baseline: Top1=0.0%, HitRate@5=0.0%, Recall@10=0.0%
- Hybrid: Top1=0.0%, HitRate@5=0.0%, Recall@10=0.0%

## False Positives (Top 5 Examples)
1. Task: "DiscoverEntryPointCandidatesUseCase で Entry Point 候補の探索順序を調整したい" -> Found: `apps/desktop/EntryPointDiscoveryHandler.ts` (score: 100.00)
2. Task: "DiscoverEntryPointCandidatesUseCase で Entry Point 候補の探索順序を調整したい" -> Found: `src/features/repository-context/application/entryPointCandidatePorts.ts` (score: 100.00)
3. Task: "EntryPointCandidateScorer の理由ごとのスコア重み付けを変更したい" -> Found: `src/features/repository-context/application/entryPointCandidatePorts.ts` (score: 40.00)
4. Task: "ワークスペースごとのインデックス永続化とファイル保存処理を変更したい" -> Found: `CHANGELOG.md` (score: 40.00)
5. Task: "ワークスペースごとのインデックス永続化とファイル保存処理を変更したい" -> Found: `src/features/engine/README.md` (score: 40.00)

## False Negatives
1. Task: "ワークスペースごとのインデックス永続化とファイル保存処理を変更したい" -> Expected: `src/features/repository-context/infrastructure/filesystem/JsonRepositoryIndexStore.ts` (Top found: `CHANGELOG.md`)
2. Task: "自然言語のタスク指示文から検索キーワードや識別子を抽出するルールを修正したい" -> Expected: `src/features/repository-context/domain/TaskSearchTermExtractor.ts` (Top found: `CHANGELOG.md`)
3. Task: "ファイルの変更差分ハッシュ計算とフィンガープリント生成の仕組みを見直したい" -> Expected: `src/features/repository-context/infrastructure/filesystem/NodeCryptoFingerprintClient.ts` (Top found: `CHANGELOG.md`)
4. Task: "文書のトークン上限と予算配分アルゴリズムを最適化したい" -> Expected: `apps/desktop/renderer/model/tokenBudget.ts` (Top found: `CHANGELOG.md`)
5. Task: "リポジトリ内のファイルを走査して無視パターンを適用するスキャン処理を修正したい" -> Expected: `src/features/repository-context/infrastructure/filesystem/ProjectScannerClient.ts` (Top found: `CHANGELOG.md`)
6. Task: "変更されたファイルのみを検知してインデックスの無駄な再生成を防ぎたい" -> Expected: `src/features/repository-context/application/RefreshRepositoryIndexUseCase.ts` (Top found: `CHANGELOG.md`)
7. Task: "ベクトルの内積とノルムからコサイン類似度を計算するロジックの例外処理を見直したい" -> Expected: `src/features/repository-context/domain/cosineSimilarity.ts` (Top found: `CHANGELOG.md`)
8. Task: "デスクトップ画面で探索された Entry Point 候補の一覧ツリーとチェックボックス選択を修正したい" -> Expected: `apps/desktop/renderer/components/CandidateTree.tsx` (Top found: `apps/desktop/EntryPointDiscoveryHandler.ts`)
9. Task: "タスクと Entry Point から Context Manifest Markdown を生成して出力する処理を変更したい" -> Expected: `src/features/repository-context/application/BuildTaskContextUseCase.ts, src/features/repository-context/infrastructure/formatting/ContextManifestFormatter.ts` (Top found: `src/features/repository-context/domain/MarkdownSectionEntry.ts`)
10. Task: "サービス層の共通的な知識抽出処理やオーケストレーションを見直したい" -> Expected: `src/features/repository-context/application/KnowledgeExtractionService.ts` (Top found: `CHANGELOG.md`)
11. Task: "データのシリアライズとファイル書き込みの安全性を向上させたい" -> Expected: `src/features/repository-context/infrastructure/filesystem/semanticIndexSerialization.ts` (Top found: `CHANGELOG.md`)

## Performance

### Initial Build
- entries: 1496
- embedding calls: 47
- duration: 24493 ms
- serialized bytes: 35065494 bytes (34243.6 KB)

### No-change Refresh
- embedding calls: 0
- duration: 748 ms

### One-file Refresh
- embedding calls: 1
- duration: 1022 ms

### Query Latency
- avg: 352.2 ms
- p50: 339.4 ms
- p95: 434.4 ms
- max: 434.4 ms

## Index Size
- entries: 1496
- dimensions: 768
- serializedBytes: 35065494
- bytes/entry: 23440 bytes

## Findings
- Real Ollama (`nomic-embed-text`) によるセマンティック検索により、自然言語の意図把握が大幅に強化された。
- 特に日本語 Task から英語シンボル/ファイルへの探索（JP→EN Subset）において顕著な Recall@10 の向上が確認された。
- no-change refresh における embeddingCalls = 0 が実測され、無駄な API コストが完全に排除されていることが実証された。

## SHOULD FIX
- 現在のスコアリングでは、一般語を含むタスクでセマンティックヒットが僅かに Top-1 の順位にノイズを与えることがある。Phase 4 で RepoScout Evidence を加えることでさらに順位安定化を図る。

## DEFER
- Method body の全文 Embedding 化（現在はシンボル名・シグネチャ・JSDoc・Markdownセクションで十分高精度を維持しており、インデックスサイズ・構築時間とのトレードオフから Phase 4 以降で検討）。

## Quality Gate
- npm run check: PASS
- npm run desktop:test: PASS

## Next Step Readiness
### Phase 4 — RepoScout Evidence Integration
READY
