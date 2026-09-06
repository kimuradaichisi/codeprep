# Gemini Execution Workflow & Design Closure

この文書は、Gemini (Antigravity Agent) における作業実行フロー（Git、文書、自己改善、完了報告）および設計完結（Design Closure）に関する共通指示です。

---

## 11. Git

明示指示がない限り、以下を行わないでください。

- commit
- push
- merge
- reset
- rebase
- checkoutによる既存作業の破棄
- 未コミット変更の削除

既存の未コミット変更には最大限注意してください。
タスク対象外の差分は触らないでください。

コミットを指示された場合:

1. 対象ファイルだけstage (`git add <file>`)
2. `git diff --cached` または同等手段で内容確認
3. 指示されたcommit messageでcommit
4. commit後に `git status` を確認

---

## 12. 文書作業

Architecture / Design文書では以下を守ってください。

- 既存の用語を優先
- 同じ説明を複数文書へ重複させない
- 詳細は適切な文書へ寄せ、他文書から参照する
- Conceptual ModelとStorage Schemaを混同しない
- 現時点で決めないことはOpen Questionとして残す
- 実装済み / 未実装 / Futureを明確に区別する

---

## 13. AI / Human Judgment の扱い

機械的に確定できる処理を、安易にAI判断へ戻さないでください。

AI/Humanに残すべきなのは主に:

- 矛盾の意味判断
- 抜け漏れ判断
- 業務整合性
- ambiguous / UNKNOWNの意味判断
- Policy / Business Ruleの承認

同じ判断が繰り返されている場合は、Rule / Workflow / Tool化候補としてObservable Traceに残せる形を優先します。

Chain-of-Thoughtや内部思考の保存は不要です。
Observableな入力・操作・結果・Evidenceだけを扱います。

---

## 14. Self-Improvement / Mechanization Feedback

この実行Contractは、Gemini自身にPromptやPolicyを書き換えさせるためのものではありません。

目的は、作業実績から

> 「次回からGemini（AIエージェント）にやらせなくてよい仕事」

を継続的に発見することです。
自己改善は、内部思考ではなく ObservableなTrace / Evidence / Result を使って行います。

### 観測対象
作業中に以下の反復を観測してください。
- 同じ検索手順を何度も実行している
- 同じ条件で同じ判断を繰り返している
- 同じ決定論的な変換・確認を繰り返している
- 一度確定した情報を毎回再探索している
- 同じUNKNOWN / ERROR原因への対処を繰り返している

### Mechanization Candidate の分類
- **Rule Candidate**: 同じpreconditionで同じ判断が繰り返される
- **Workflow Candidate**: 同じ探索・確認手順が同じ順序で繰り返される
- **Tool Candidate**: 入出力が明確で、処理全体を決定論的に実装できる
- **Reusable Knowledge Candidate**: 一度確認した事実・Relationを毎回再発見している

### 自動で昇格してはいけないもの
新しい業務ルールの制定、法令・規程の意味解釈、顧客固有の判断、リスク許容判断、Policy変更、Evidenceだけでは正しさを決められないsemantic judgment。

### Promotionの考え方
昇格順序: `OBSERVED -> CANDIDATE -> SHADOW -> VERIFIED -> ACTIVE -> SUPERSEDED / ROLLED_BACK`

### Coverageよりfalse PASSを優先する
Rule / Workflow / Toolの価値はCoverage 100%ではなく、安全に高認知負荷な判断を不要にできた割合で測ります。false PASSが発生するならCoverageを下げてでもUNKNOWNへ逃がしてください。

### Self-Modificationは禁止
`AGENTS.md`、本契約文書、システム/プロジェクトポリシー、共通プロンプト、Business Rule等を独断で自己改変しないこと。

### 完了報告への反映
明確なMechanization Candidateを発見した場合のみ、報告末尾に以下を1行追加（なければ出力不要）:
`Mechanization Candidate: <Rule | Workflow | Tool | Reusable Knowledge> — <短い説明>`

---

## 15. コスト最適化

コスト削減の対象:
- 不要な全文Write
- 既知範囲へのsubagent起動
- 同じ情報の再探索
- 指示内容の完了報告での繰り返し
- 長大な定型報告
- Acceptanceに影響しない追加調査

削ってはいけないもの:
- 必要なRead / Grep
- 仮説検証
- boundary case確認
- Acceptance Test
- ERROR / UNKNOWN原因調査
- false PASS確認
- 設計判断に必要なEvidence

原則: **調査量と報告量は別物である。** 必要な検証は実施し、報告だけを簡潔にしてください。

### 15.1 検証サイクル規約 (Pinpoint-First & Batch Gate)
- **開発・修正中 (ピンポイント検証):**
  - 都度の動作確認やリファクタリング検証では、変更対象ファイル・関連モジュールのみをピンポイントで実行する。
  - 推奨コマンド:
    - `npm run test:file -- <test_path>`（指定した単一テストのみ実行: 数百ms）
    - `npm run test:changed`（Git変更分に関連するテストのみ実行）
    - `npx tsc --noEmit`（型チェックのみ）
  - 中間段階で `npm run check` や全スイート実行を乱用しない（待ち時間とリソース消費を防止）。
- **タスク完了時 (一括ゲート):**
  - 全ステップの実装が完了し、最終提出・報告を行う直前にのみ、包括的品質ゲート（`npm run check`, `npm run desktop:test`）を1回まとめて実行する。

---

## 16. 完了報告

### 16.1 タスク完了時の CHANGELOG.md 記録規約
タスク作業（機能追加、不具合修正、リファクタリング、ドキュメント整備等）が完了した際は、**必ずプロジェクトルートの `CHANGELOG.md` に変更概要を記録**してください。
- **粒度・タイミング:** 中間の小ステップや個々のgit commitごとではなく、依頼された一連のタスク（作業スコープ全体）が完了し、最終的な完了報告を行うタイミングで**1回まとめて記載**する。
- **記載場所:** `CHANGELOG.md` の未リリースセクション（`## [Unreleased]`、または最新バージョン見出し直下）
- **プレフィックス記法:** Conventional Commitsに準拠（`- feat: ...`, `- fix: ...`, `- refactor: ...`, `- docs: ...`, `- chore: ...` 等）

### 16.2 完了報告フォーマット
個別タスクで別指定がない限り、詳細な作業日誌は不要です。
基本報告は以下だけです:

- 結果: GO / NO-GO / 完了 / 未完了
- 変更ファイル（`CHANGELOG.md` を含む）
- GO/NO-GO判断を左右した事実: 最大3点
- Quality:
  - Implementation Quality
  - Contract Quality
  - Evidence Coverage（REAL / SYNTHETIC / STATIC / NOT_VERIFIEDの重要部分のみ）
  - Claim Scope（必要ならFULL / LIMITED）
- 未解決事項（ある場合のみ）
- git status

---

## 17. 個別タスクとの優先順位

この共通指示はデフォルト方針です。個別タスクで明示的に異なる指示がある場合は、個別タスクを優先してください。
ただし以下は常に維持します:
- false PASSを避ける
- Evidenceなしで推測しない
- UNKNOWN / ERRORを隠さない
- 未コミット変更を勝手に破棄しない
- 品質をコスト削減のために犠牲にしない

---

## 18. 実行開始

この文書を読んだら、内容を長く要約して返す必要はありません。
個別タスクが続けて与えられている場合は、そのまま作業を開始してください。
必要な確認事項が本当に解決不能な場合だけ質問してください。既存ファイルを読めば解決できることを質問しないこと。

---

## Design Closure / One-Pass Completion

タスクを「指示されたテストが通った時点」で完了としない。
実装前と完了報告前に、現在の成果物がその直後の利用者・次工程から見ても意味論的に閉じているか確認する。

### 実装前確認
1. この成果物を次に誰/何が使うか
2. 次工程が必要とするInput / Output / Scope / Identity
3. 同じ名前・同じ数値でも意味やdimensionが異ならないか
4. Aggregateとindividual observationを混同していないか
5. Pattern scope / execution scope / knowledge scope等、異なるscopeを流用していないか
6. PASS / MATCH / READY等をcorrectnessと誤認していないか
7. 不足情報を推測で埋めずUNKNOWN / NOT_COMPARABLE / NOT_READYとして表現できるか

### 次工程を意識するが、先回り実装しない
原則:
> Design for the next consumer.  
> Implement only the current layer.

次工程が必要とするContractは考慮するが、次工程そのものを実装してはならない。汎用Engine、将来用DSL、未要求のRegistry、speculative abstractionなどは作らない。

### 完了前 Self-Review
全品質ゲートgreen後、報告前に1回だけadversarial design reviewを行う:
- テストが偶然通っているだけのケースはないか
- 同じ値だが異なる意味を比較していないか
- bool自己申告で本来のEvidenceを代替していないか
- REAL / SYNTHETIC / STATICの主張範囲が正しいか
- 現在の実データでは評価不能なのに0件/MATCH/PASSとしていないか
- 次工程に渡した瞬間に不足が明らかになるContractになっていないか

### 往復削減
ユーザーに返す前に「次に指摘されそうな設計上の穴」を一度自分で検査する。ただし質問を減らすために推測して仕様を決めてはならず、安全に決められないものはUNKNOWNとして保持する。
