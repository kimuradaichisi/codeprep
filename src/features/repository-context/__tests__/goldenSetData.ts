import type { GoldenTask } from './GoldenSetEvaluator';

export const GOLDEN_SET_TASKS: readonly GoldenTask[] = [
  { task: '返品時の二重返金を調査する duplicate refund', expectedEntryPoints: ['src/order/OrderService.ts', 'docs/order/refund.md'] },
  { task: '返金ポリシーの例外と申請期限の確認 policy window', expectedEntryPoints: ['docs/order/refund.md', 'src/order/ReturnPolicy.ts'] },
  { task: '注文キャンセルに伴う決済返金処理の不具合 payment cancel', expectedEntryPoints: ['src/billing/PaymentGateway.ts', 'src/order/OrderService.ts'] },
  { task: 'クレジットカード決済時のエラーハンドリング改善 card payment', expectedEntryPoints: ['src/billing/PaymentGateway.ts'] },
  { task: 'ユーザー認証トークンの有効期限切れと再発行フロー jwt expire', expectedEntryPoints: ['src/auth/AuthTokenManager.ts', 'docs/auth/jwt_flow.md'] },
  { task: 'ログインセッションのリフレッシュ処理 token refresh', expectedEntryPoints: ['src/auth/AuthTokenManager.ts'] },
  { task: '返品用配送ラベルの発行手続き return shipping label', expectedEntryPoints: ['docs/order/return_guide.md', 'src/order/ReturnPolicy.ts'] },
  { task: 'ユーザーのアバター画像変更処理 user avatar', expectedEntryPoints: ['src/user/UserProfileService.ts'] },
  { task: 'メールアドレス変更時の確認メール送信 email change', expectedEntryPoints: ['src/user/UserProfileService.ts'] },
  { task: 'StripeのWebhook通知受信と署名検証 stripe webhook', expectedEntryPoints: ['docs/billing/stripe_setup.md', 'src/billing/PaymentGateway.ts'] },
  { task: '返金可能かどうかの条件判定ロジック refund check', expectedEntryPoints: ['src/order/ReturnPolicy.ts', 'docs/order/refund.md'] },
  { task: 'JWTトークンの署名検証に失敗するバグ token signature verify', expectedEntryPoints: ['src/auth/AuthTokenManager.ts', 'docs/auth/jwt_flow.md'] },
  { task: '新規注文の作成と在庫引当 create order inventory', expectedEntryPoints: ['src/order/OrderService.ts'] },
  { task: '決済ゲートウェイの接続タイムアウト設定 gateway timeout', expectedEntryPoints: ['src/billing/PaymentGateway.ts', 'config/app.json'] },
  { task: '返金処理の冪等性チェック idempotent refund check', expectedEntryPoints: ['src/order/OrderService.ts', 'docs/order/refund.md'] },
];
