export type PlsScenarioInput = {
  capitalAmount: string;
  profitOutcome: string;
  lossOutcome: string;
  financierProfitSharePercent: number;
  ventureOperatorProfitSharePercent: number;
};

export type PlsScenarioIssue = {
  path: keyof PlsScenarioInput;
  message: string;
};

export type PlsScenarioAllocation = {
  partyRole: 'financier' | 'ventureOperator';
  amount: string;
  basis: string;
};

export type PlsScenarioComparison = {
  capitalAmount: string;
  profitScenario: {
    grossOutcome: string;
    allocations: PlsScenarioAllocation[];
    explanation: string;
  };
  lossScenario: {
    grossOutcome: string;
    allocations: PlsScenarioAllocation[];
    explanation: string;
  };
  notices: string[];
};

export type PlsScenarioResult =
  | { status: 'calculated'; scenario: PlsScenarioComparison }
  | { status: 'invalidInput'; issues: PlsScenarioIssue[] };

function issue(path: keyof PlsScenarioInput, message: string): PlsScenarioIssue {
  return { path, message };
}

function parseMoneyToMinorUnits(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    throw new Error('invalid money value');
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0'));
  return (whole * 100n) + fraction;
}

function formatMinorUnits(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, '0')}`;
}

function validateMoney(
  input: PlsScenarioInput,
  path: 'capitalAmount' | 'profitOutcome' | 'lossOutcome',
  label: string,
): PlsScenarioIssue[] {
  try {
    const value = parseMoneyToMinorUnits(input[path]);
    if (path === 'capitalAmount' && value <= 0n) {
      return [issue(path, `${label} must be greater than zero`)];
    }
  } catch {
    return [issue(path, `${label} must be a non-negative money value with up to two decimals`)];
  }

  return [];
}

function validateRatio(input: PlsScenarioInput): PlsScenarioIssue[] {
  const issues: PlsScenarioIssue[] = [];
  const financier = input.financierProfitSharePercent;
  const operator = input.ventureOperatorProfitSharePercent;

  if (!Number.isInteger(financier) || financier < 0 || financier > 100) {
    issues.push(issue('financierProfitSharePercent', 'Financier share must be a whole percentage from 0 to 100'));
  }

  if (!Number.isInteger(operator) || operator < 0 || operator > 100) {
    issues.push(issue('ventureOperatorProfitSharePercent', 'Operator share must be a whole percentage from 0 to 100'));
  }

  if (Number.isInteger(financier) && Number.isInteger(operator) && financier + operator !== 100) {
    issues.push(issue('ventureOperatorProfitSharePercent', 'Profit sharing percentages must total 100'));
  }

  return issues;
}

export function calculatePlsScenario(input: PlsScenarioInput): PlsScenarioResult {
  const issues = [
    ...validateMoney(input, 'capitalAmount', 'Capital amount'),
    ...validateMoney(input, 'profitOutcome', 'Profit outcome'),
    ...validateMoney(input, 'lossOutcome', 'Loss outcome'),
    ...validateRatio(input),
  ];

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const capital = parseMoneyToMinorUnits(input.capitalAmount);
  const profit = parseMoneyToMinorUnits(input.profitOutcome);
  const loss = parseMoneyToMinorUnits(input.lossOutcome);
  const financierProfit = (profit * BigInt(input.financierProfitSharePercent)) / 100n;
  const operatorProfit = profit - financierProfit;
  const financierLoss = -loss;

  return {
    status: 'calculated',
    scenario: {
      capitalAmount: formatMinorUnits(capital),
      profitScenario: {
        grossOutcome: formatMinorUnits(profit),
        allocations: [
          {
            partyRole: 'financier',
            amount: formatMinorUnits(financierProfit),
            basis: `${input.financierProfitSharePercent}% agreed profit share`,
          },
          {
            partyRole: 'ventureOperator',
            amount: formatMinorUnits(operatorProfit),
            basis: `${input.ventureOperatorProfitSharePercent}% agreed profit share`,
          },
        ],
        explanation: 'Profit is split according to the pre-agreed ratio after allowed costs in this restricted seedbed scenario.',
      },
      lossScenario: {
        grossOutcome: formatMinorUnits(financierLoss),
        allocations: [
          {
            partyRole: 'financier',
            amount: formatMinorUnits(financierLoss),
            basis: 'Capital provider bears financial loss unless misconduct is established',
          },
          {
            partyRole: 'ventureOperator',
            amount: '0.00',
            basis: 'Venture operator does not receive a distribution in the loss scenario',
          },
        ],
        explanation: 'Financial loss is shown against the capital provider for the MVP scenario and does not guarantee principal recovery.',
      },
      notices: [
        'Simulation only.',
        'No payment execution is performed.',
        'No guaranteed profit or principal is implied.',
        'Not formal Shariah certification.',
      ],
    },
  };
}
