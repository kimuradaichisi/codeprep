# Gemini Execution Contract

この文書は、Gemini (Antigravity Agent) に作業を依頼するときに最初に与える共通指示です。
個別タスクの指示より先に読み、この方針をデフォルト動作として適用してください。

---

## 1. 基本原則

目的は、**高品質な結果を、必要最小限の探索・変更・出力で得ること**です。

コスト削減は品質より優先しません。
ただし、成果に寄与しない再探索・再説明・全面書き直し・過剰なsubagent利用は避けてください。

重要な原則:

> 安い手段を優先する。  
> ただし、Acceptance条件を満たすために必要な調査・検証・Evidence取得は省略しない。

> 検証はピンポイントで実施する。  
> 開発・試行中は対象ファイルのみを局所検証（`npm run test:file -- <path>` または `npm run test:changed`）し、規約確認も `npm run lint:standards:changed` で局所確認する。全体のフルチェック（`npm run check` 等）はタスク完了時にまとめて1回実施する。

> インターフェース変更時は全量一括同期する。  
> `DesktopApi` や Ports 等の共通シグネチャ変更時は、テスト実行前に `grep_search` で全参照・モック箇所を特定し、同一ターン内で一括同期する（逐次テスト失敗によるモグラ叩きの禁止）。

> メソッド長は10行セーフティマージンを設ける。  
> 制限は15行/メソッドだが、新規実装・変更時は原則10行以内を目標に設計し、後からの分割手戻りを防ぐ。

> 機械的に確認できることは機械的に確認する。  
> 確認できないことは推測で埋めず、UNKNOWN / UNRESOLVED / ERRORとして扱う。

> false PASS は UNKNOWN より重大な失敗である。

---

## 2. 作業開始時の動き

個別タスクを受けたら、いきなり編集を始めないでください。
最初に必要最小限の範囲だけ確認します。

優先順位:

1. 指示された対象ファイル
2. 直接依存するコード / 文書
3. 関連テスト
4. 必要なArchitecture / Contract
5. それでも場所が分からない場合だけ探索範囲を広げる

既に対象ファイルや場所が明確なら、広範囲探索を行わないでください。

---

## 3. Read / Grep / Explore / Subagent の使い分け

### 直接 Read / Grep (`view_file`, `grep_search`, `find_by_name`) を優先するケース

- 対象ファイルが分かっている
- symbol / class / function / heading が分かっている
- 変更範囲が狭い
- 数ファイルを確認すれば判断できる
- 既に過去タスクで場所が特定されている

### Explore / Subagent (`invoke_subagent`) を使ってよいケース

- 実装場所が分からない
- 複数領域を横断する必要がある
- 大きなRepositoryで関連箇所の候補が不明
- 直接Read/Grepを繰り返すより探索を委譲した方が明らかに安い
- 独立した調査を並列化する価値がある

### 禁止事項

- 狭い既知範囲にsubagentを起動しない
- 「念のため」だけでRepository全体を探索しない
- 同じ内容を親Agentとsubagentの両方で再調査しない

---

## 4. Edit / Write の使い分け

既存ファイルは原則として **Edit (`replace_file_content`)** を優先してください。

### Edit (`replace_file_content`)

- 一部セクション修正
- 関数単位の変更
- 文言修正
- 数十行程度の変更
- Architecture文書への追記

### Write (`write_to_file`) / 全面再構成

以下の場合のみ許可します。

- 新規ファイル
- ファイル構造そのものを大幅に再設計する
- 局所Editでは一貫性を保てない
- 個別タスクで全面書き直しを明示されている

「変更があるから全文を書き直す」は禁止です。

---

## 5. 調査の止め時

十分なEvidenceが得られたら探索を止めてください。

追加調査を行うのは、以下の場合だけです。

- Acceptance判断に必要
- false PASSの可能性がある
- ERROR / UNKNOWNの原因特定が必要
- 変更影響範囲がまだ不明
- 既存Contractとの整合が確認できない

確認済みの内容を別表現で再確認するためだけの探索は不要です。

---

## 6. 決定論と不確実性

「Deterministic」は「必ず正解を出す」という意味ではありません。

以下を意味します。

- 実行手順が再現可能
- Evidenceが追跡可能
- 同条件なら同じ観測結果を返す
- 確定不能なら UNKNOWN / UNRESOLVED を返す
- Tool自体が失敗したら ERROR を返す
- semantic guessでPASSに変換しない
- retryで不安定性を隠さない

判断不能は有効な結果です。

---

## 7. Evidence First

重要な判断にはEvidenceを持たせてください。

例:

- file / line
- test result
- command result
- source location
- existing contract
- reproducible observation
- explicit configuration

「たぶん」「一般的には」だけでコードや設計を変更しないでください。

既存Architecture / Contractと衝突する場合は、勝手に整合させず、差分・Open Questionとして報告してください。

---

## 8. Observation / Resolution / Judgment を混同しない

可能な限り以下を分離して考えてください。

### Observation
観測した事実。
例:
- grepで文字列が見つかった
- APIやコマンドがこの値を返した
- AST/型定義がlocationを返した

### Resolution
機械的に対象を確定できるか。
結果例:
- PASS
- UNKNOWN / UNRESOLVED
- ERROR

### Judgment
意味上の判断。
例:
- confirmed
- false positive
- contradiction
- business inconsistency

ERRORやUNKNOWNをfalse positiveなどの意味判断へ潰さないでください。

---

## 9. 変更方針

変更は、個別タスクの目的を満たす **最小変更** にしてください。

禁止:

- Acceptanceを通すためだけの新機能追加
- 頼まれていないリファクタリング
- 無関係な命名変更
- 依存ライブラリ追加
- 不要な抽象化
- 将来必要かもしれない機能の先行実装
- 個別の不具合を隠すretry / fallback
- 特定製品・server名だけに依存したhack（明示要求がある場合を除く）

必要ならNO-GOを返してください。
正しいNO-GOは、誤ったGOより価値があります。

---

## 10. Quality Contract

**Quality is not defined by test-green alone.**

`vitest / pytest / lint / typing / complexity` がすべてgreenでも、
それだけで「実運用上の正しさ」や「GO判断の妥当性」を保証したことにはしません。

品質は必ず以下の4層に分けて評価してください。

### 10.1 Implementation Quality
実装そのものが壊れていないかを評価します。
基本ゲート:
- 既存テストを読む
- 不具合修正は再現テストを先に追加
- 関連テスト
- 全体テストスイート (`vitest run`, `npm run check` 等)
- lint / format / type check / プロジェクト固有のsize / complexity gate
- git diff の確認

さらに単なる「テスト件数」ではなく **Test Adequacy**（positive, negative, boundary, failure mode, regression, safety invariant）を確認してください。単なる件数合格は未テストの failure mode の安全性を意味しません。

### 10.2 Contract Quality
Architecture / Contractで定義した意味論を破っていないかを評価します。
代表例:
- UNKNOWN / UNRESOLVED / ERRORを握りつぶさない
- ERRORをfalse positiveなどの意味判断へ変換しない
- semantic fallbackでPASSを作らない
- false PASSをUNKNOWNより重大視する
- 同条件で同じObservable Resultを返す
- input order / filesystem order / dict order等の偶然に依存しない
- 正解ラベルがないのにcorrectnessやfalse PASS=0を主張しない
- declared scopeを超えて完全性を主張しない

### 10.3 Evidence Quality
各主張について、**何によって確認されたか**を区別してください。
Evidence Type:
- **REAL**: 実Repository / 実Trace / 実データ / 実システム等で直接確認
- **SYNTHETIC**: test fixture / synthetic data / mock等で確認
- **STATIC**: コードレビュー / grep / 型構造 / 設定検査等の静的確認
- **NOT_VERIFIED**: まだ直接確認していない

STATIC確認をREALと呼ばず、syntheticでの確認を「実データで確認済み」と言わないこと。不足分はClaim Scopeを限定してください。

### 10.4 Decision Quality
GO / NO-GOは、自動テスト結果ではなく **明示的なAcceptance Criteria + Evidence** から判断してください。
- Decision: GO / NO-GO / CONDITIONAL_GO
- Claim Scope: FULL / LIMITED
- Evidence Coverage: SUFFICIENT / PARTIAL / INSUFFICIENT

### 10.5 Claim Discipline
利用可能なEvidenceが支える範囲だけを主張してください。「コード上同じはず」は設計上の推論であり、実Evidenceとして扱わないでください。

### 10.6 Qualityのために追加調査する条件
false PASSの可能性、GO/NO-GO判断の左右、Contract invariant未確認、failure mode直結の場合はコスト削減より品質確認を優先します。安全にClaim Scopeを限定できる場合は無理に実データを探し続けず `NOT_VERIFIED` として残します。

### 10.7 品質ゲートを通すために意味を変えない
テスト・lint・typing・complexity gateを通すためだけに、Contractの意味やObservationを歪めないでください。正しいNO-GO、PARTIAL Evidence、NOT_VERIFIEDは誤った「all green」より価値があります。
