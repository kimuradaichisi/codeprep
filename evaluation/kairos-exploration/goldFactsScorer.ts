// evaluation/kairos-exploration/goldFactsScorer.ts
import type { CriticalError, GoldFactAssessment, ScoringResult } from './types';

function evaluateGoldFact(id: string, name: string, weight: number, text: string, re: RegExp): GoldFactAssessment {
  const achieved = re.test(text);
  return { id: id as any, name, weight, achieved, notes: achieved ? 'Identified in answer' : 'Missing or incomplete' };
}

function assessGolds(t: string): GoldFactAssessment[] {
  return [
    evaluateGoldFact('GOLD-1-REAL-DAILY-CLI', 'Real Daily CLI Flow', 15, t, /daily_cli_usecase.*(ingest|real_pnl|trade_setup)/i),
    evaluateGoldFact('GOLD-2-SCHEDULER-API-FLOW', 'Scheduler / API Paper Flow', 10, t, /scheduler.*(paper_cycle|signal_check|execute_daily_routine)/i),
    evaluateGoldFact('GOLD-3-STARTUP-USECASE', 'Startup Usecase Scope', 5, t, /startup_usecase.*(banner|logging|初期化|環境)/i),
    evaluateGoldFact('GOLD-4-PAPER-MARKET-SAFETY', 'Paper Market Safety Gate', 10, t, /(paper_cycle|_handle_buy_orders).*is_market_safe/i),
    evaluateGoldFact('GOLD-5-SCREENING-NO-MMTW', 'Screening No MMTW Gate', 10, t, /DailyScreener.*(MMTW.*(未適用|適用されない|gate.*ない)|直接.*gate)/i),
    evaluateGoldFact('GOLD-6-SIGNAL-CHECK-TRAP', 'Signal Check Trap (No df_all)', 15, t, /signal_check.*(df_all.*(渡して|未指定|なし)|breadth.*(評価され|無効)|戻り値.*(使わ|未使用))/i),
    evaluateGoldFact('GOLD-7-REAL-TRADE-SETUP-NO-MMTW', 'Real Trade Setup No MMTW', 15, t, /trade_setup.*(MMTW.*(gate.*ない|未検証|直前.*なし)|通知のみ)/i),
    evaluateGoldFact('GOLD-8-REAL-TRADING-MANUAL', 'Real Trading Manual Semantics', 10, t, /real_pnl.*(自動発注.*(ない|行わない)|記録|手動|broker.*(連携なし|API.*呼出.*ない))/i),
    evaluateGoldFact('GOLD-9-REGISTER-REAL-TRADE-LEGACY', 'Legacy register_real_trade.py', 5, t, /register_real_trade.*(独立|補助|legacy|ハードコード)/i),
    evaluateGoldFact('GOLD-10-MMTW-THRESHOLDS-HARDCODE', 'MMTW Thresholds Hardcode', 5, t, /40(\.0)?.*(50(\.0)?)?.*(ハードコード|ratio)/i),
  ];
}

function assessCriticalErrors(t: string): CriticalError[] {
  const errs: CriticalError[] = [
    { name: 'real_pnl = broker自動発注と誤認', penalty: 15, detected: /real_pnl.*(自動発注.*行う|broker.*(注文.*送信|直接発注))/i.test(t), notes: '' },
    { name: '全経路でMMTWが効いていると誤認', penalty: 15, detected: /(全経路|すべての経路).*(MMTW|MarketFilter).*(適用されている|有効|機能)/i.test(t), notes: '' },
    { name: 'signal_checkでMMTW gate済みと誤認', penalty: 15, detected: /signal_check.*(MMTW|MarketFilter).*正常に(gate|機能|制御)/i.test(t), notes: '' },
    { name: 'scheduler flow = real-money daily flowと混同', penalty: 15, detected: /scheduler.*(実取引|リアルマネー|実売買.*直接)/i.test(t), notes: '' },
  ];
  return errs.map((e) => ({ ...e, notes: e.detected ? 'CRITICAL ERROR DETECTED (-15)' : 'Clean' }));
}

export function scoreAnswer(answerText: string): ScoringResult {
  const golds = assessGolds(answerText);
  const errors = assessCriticalErrors(answerText);
  const totalGolds = golds.reduce((acc, g) => acc + (g.achieved ? g.weight : 0), 0);
  const totalPenalties = errors.reduce((acc, e) => acc + (e.detected ? e.penalty : 0), 0);
  const finalScore = Math.max(0, Math.min(100, totalGolds - totalPenalties));

  return {
    totalScore: finalScore,
    entryPointScore: golds[0].achieved ? 15 : 0,
    schedulerApiScore: golds[1].achieved ? 10 : 0,
    screeningScore: golds[4].achieved ? 10 : 0,
    paperScore: golds[3].achieved ? 10 : 0,
    realFlowScore: golds[6].achieved ? 15 : 0,
    mmtwConsistencyScore: (golds[5].achieved ? 15 : 0) + (golds[9].achieved ? 5 : 0),
    realTradingSemanticsScore: golds[7].achieved ? 10 : 0,
    docDriftScore: 5,
    disconnectedComponentScore: golds[8].achieved ? 5 : 0,
    penalties: totalPenalties,
    goldFacts: golds,
    criticalErrors: errors,
  };
}
