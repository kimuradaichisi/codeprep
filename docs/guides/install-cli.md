# CodePrep CLI インストール・運用ガイド

本ドキュメントでは、CodePrep CLI を npm pack 経由でローカルビルド・インストールし、外部リポジトリから自律型コーディングエージェント用のツールとして実行する手順を説明します。

---

## 1. 前提条件 (Requirements)

- **Node.js**: `v22.0.0` 以上 (組み込み `node:sqlite` 機能を利用)
- **OS**: Windows / Linux / macOS (クロスプラットフォーム対応)
- **パッケージマネージャー**: `npm` (`v9.0.0` 以上推奨)

---

## 2. ビルド & パッケージング (Build & Pack)

CodePrep リポジトリのルートディレクトリで以下を実行します。

```bash
# 1. 依存関係の解決
npm install

# 2. プロダクション用バンドルビルド
npm run build

# 3. npm pack による tarball 生成
npm pack
```

実行後、ルートディレクトリに `codeprep-vscode-<version>.tgz`（約 2.3MB）が生成されます。

---

## 3. ローカル Tarball インストール (Local Install)

### グローバルインストール (PATH 経由でシステム全体から使用)

```bash
npm install -g ./codeprep-vscode-<version>.tgz
```

Windows 環境または POSIX 環境の PATH に `codeprep` コマンドが配置されます。

---

## 4. 動作検証 (Verify)

任意の作業ディレクトリ（CodePrep 以外の外部リポジトリなど）に移動して動作を確認します。

```bash
# 1. バージョン確認
codeprep --version
# 出力例: codeprep 0.8.22

# 2. 全体ヘルプの確認
codeprep --help

# 3. 機械可読コマンド一覧の取得 (JSON)
codeprep commands --json

# 4. カレントワークスペースのバインド状態確認
codeprep status --format json
```

---

## 5. アンインストール (Uninstall)

```bash
npm uninstall -g codeprep-vscode
```

アンインストール後、`where codeprep` (Windows) または `which codeprep` (Linux/macOS) でバイナリが削除されていることを確認できます。

---

## 6. クリーン再インストール検証 (Clean Reinstall Test)

グローバル環境のキャッシュや残存設定に依存しないことを保証するため、以下の順でクリーン検証を実施できます:

```bash
npm uninstall -g codeprep-vscode
npm install -g ./codeprep-vscode-<version>.tgz
codeprep --version
```

---

## 7. 既知の制約事項 (Known Limitations)

- **npm Registry 未公開 (Phase 7M-B 時点)**: 現在はローカル tarball による配布・利用を標準としています（将来フェーズでレジストリ公開予定）。
- **Node.js 22+ 必須**: SQLite データベース処理に Node.js 組み込みモジュール (`node:sqlite`) を採用しているため、Node 22 未満では動作しません。
- **MCP サーバーとの分離**: MCP サーバーは現時点で拡張機能・スタンドアロン実行形式で提供されており、同一パッケージ配布は DEFER としています。
