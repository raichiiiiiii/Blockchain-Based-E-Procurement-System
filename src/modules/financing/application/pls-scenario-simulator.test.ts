import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculatePlsScenario } from './pls-scenario-simulator.js';

describe('PLS scenario simulator', () => {
  it('calculates profit allocation from the agreed ratio', () => {
    const result = calculatePlsScenario({
      capitalAmount: '68000.00',
      profitOutcome: '10000.00',
      lossOutcome: '5000.00',
      financierProfitSharePercent: 60,
      ventureOperatorProfitSharePercent: 40,
    });

    assert.strictEqual(result.status, 'calculated');
    if (result.status !== 'calculated') {
      assert.fail('Expected scenario calculation');
    }

    assert.strictEqual(result.scenario.profitScenario.grossOutcome, '10000.00');
    assert.strictEqual(result.scenario.profitScenario.allocations[0].amount, '6000.00');
    assert.strictEqual(result.scenario.profitScenario.allocations[1].amount, '4000.00');
  });

  it('shows financial loss against the capital provider without guaranteeing principal or profit', () => {
    const result = calculatePlsScenario({
      capitalAmount: '68000.00',
      profitOutcome: '10000.00',
      lossOutcome: '5000.00',
      financierProfitSharePercent: 60,
      ventureOperatorProfitSharePercent: 40,
    });

    assert.strictEqual(result.status, 'calculated');
    if (result.status !== 'calculated') {
      assert.fail('Expected scenario calculation');
    }

    assert.strictEqual(result.scenario.lossScenario.grossOutcome, '-5000.00');
    assert.strictEqual(result.scenario.lossScenario.allocations[0].amount, '-5000.00');
    assert.strictEqual(result.scenario.lossScenario.allocations[1].amount, '0.00');
    assert.ok(result.scenario.notices.includes('No guaranteed profit or principal is implied.'));
  });

  it('rejects ratios that do not total 100', () => {
    const result = calculatePlsScenario({
      capitalAmount: '68000.00',
      profitOutcome: '10000.00',
      lossOutcome: '5000.00',
      financierProfitSharePercent: 65,
      ventureOperatorProfitSharePercent: 40,
    });

    assert.strictEqual(result.status, 'invalidInput');
    if (result.status !== 'invalidInput') {
      assert.fail('Expected invalid input');
    }

    assert.deepEqual(result.issues.map(item => item.path), ['ventureOperatorProfitSharePercent']);
  });

  it('rejects invalid money inputs', () => {
    const result = calculatePlsScenario({
      capitalAmount: '0.00',
      profitOutcome: 'profit',
      lossOutcome: '5000.000',
      financierProfitSharePercent: 60,
      ventureOperatorProfitSharePercent: 40,
    });

    assert.strictEqual(result.status, 'invalidInput');
    if (result.status !== 'invalidInput') {
      assert.fail('Expected invalid input');
    }

    assert.deepEqual(result.issues.map(item => item.path), [
      'capitalAmount',
      'profitOutcome',
      'lossOutcome',
    ]);
  });
});
