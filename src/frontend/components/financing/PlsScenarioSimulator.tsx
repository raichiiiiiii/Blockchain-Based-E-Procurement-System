import { useEffect, useMemo, useState } from 'react';
import {
  calculatePlsScenario,
  type PlsScenarioComparison,
  type PlsScenarioInput,
} from '../../../modules/financing/application/pls-scenario-simulator';
import type { PlsContract } from '../../api/pls-financing';

type PlsScenarioSimulatorProps = {
  contract: PlsContract;
};

type SimulatorForm = {
  capitalAmount: string;
  profitOutcome: string;
  lossOutcome: string;
  financierProfitSharePercent: string;
};

const defaultProfitOutcome = '10000.00';
const defaultLossOutcome = '5000.00';

function createFormState(contract: PlsContract): SimulatorForm {
  return {
    capitalAmount: contract.capitalAmount,
    profitOutcome: defaultProfitOutcome,
    lossOutcome: defaultLossOutcome,
    financierProfitSharePercent: String(contract.profitShare.financierPercent),
  };
}

function formatRole(role: PlsScenarioComparison['profitScenario']['allocations'][number]['partyRole']): string {
  return role === 'financier' ? 'Financier' : 'Supplier operator';
}

function toScenarioInput(form: SimulatorForm): PlsScenarioInput {
  const financierShare = Number(form.financierProfitSharePercent);
  const operatorShare = Number.isFinite(financierShare) ? 100 - financierShare : Number.NaN;

  return {
    capitalAmount: form.capitalAmount,
    profitOutcome: form.profitOutcome,
    lossOutcome: form.lossOutcome,
    financierProfitSharePercent: financierShare,
    ventureOperatorProfitSharePercent: operatorShare,
  };
}

function PlsScenarioSimulator({ contract }: PlsScenarioSimulatorProps) {
  const [form, setForm] = useState<SimulatorForm>(() => createFormState(contract));

  useEffect(() => {
    setForm(createFormState(contract));
  }, [contract.contractId]);

  const scenarioResult = useMemo(() => calculatePlsScenario(toScenarioInput(form)), [form]);
  const operatorShare = Number(form.financierProfitSharePercent);
  const operatorShareLabel = Number.isFinite(operatorShare) ? `${100 - operatorShare}%` : 'Set financier ratio';

  return (
    <section className="pls-simulator" aria-label="PLS scenario simulator">
      <div className="admin-section-header">
        <div>
          <h3>PLS scenario simulator</h3>
          <p>Compare profit and loss outcomes for the restricted seedbed without recording a distribution or executing payment.</p>
        </div>
        <span className="admin-status admin-status-pending">Simulation only</span>
      </div>

      <form className="admin-form pls-simulator-form">
        <label>
          Capital amount
          <input
            inputMode="decimal"
            value={form.capitalAmount}
            onChange={event => setForm(current => ({
              ...current,
              capitalAmount: event.target.value,
            }))}
          />
        </label>
        <label>
          Profit outcome
          <input
            inputMode="decimal"
            value={form.profitOutcome}
            onChange={event => setForm(current => ({
              ...current,
              profitOutcome: event.target.value,
            }))}
          />
        </label>
        <label>
          Loss outcome
          <input
            inputMode="decimal"
            value={form.lossOutcome}
            onChange={event => setForm(current => ({
              ...current,
              lossOutcome: event.target.value,
            }))}
          />
        </label>
        <label>
          Financier profit ratio
          <input
            inputMode="numeric"
            value={form.financierProfitSharePercent}
            onChange={event => setForm(current => ({
              ...current,
              financierProfitSharePercent: event.target.value,
            }))}
          />
          <small>Supplier operator ratio: {operatorShareLabel}</small>
        </label>
      </form>

      {scenarioResult.status === 'invalidInput' ? (
        <div className="admin-alert admin-alert-error" role="alert">
          {scenarioResult.issues.map(issue => issue.message).join(' ')}
        </div>
      ) : (
        <>
          <div className="pls-simulator-summary">
            <div>
              <span>Capital</span>
              <strong>{contract.currency} {scenarioResult.scenario.capitalAmount}</strong>
              <p>Reference amount for this simulation only.</p>
            </div>
            <div>
              <span>Profit ratio</span>
              <strong>{form.financierProfitSharePercent}% / {operatorShareLabel}</strong>
              <p>Agreed ratio before activation.</p>
            </div>
          </div>

          <div className="pls-simulator-grid">
            <article className="workflow-meta-panel">
              <span>Profit scenario</span>
              <strong>{contract.currency} {scenarioResult.scenario.profitScenario.grossOutcome}</strong>
              <p>{scenarioResult.scenario.profitScenario.explanation}</p>
              {scenarioResult.scenario.profitScenario.allocations.map(allocation => (
                <p key={`profit-${allocation.partyRole}`}>
                  {formatRole(allocation.partyRole)}: {contract.currency} {allocation.amount} - {allocation.basis}
                </p>
              ))}
            </article>
            <article className="workflow-meta-panel">
              <span>Loss scenario</span>
              <strong>{contract.currency} {scenarioResult.scenario.lossScenario.grossOutcome}</strong>
              <p>{scenarioResult.scenario.lossScenario.explanation}</p>
              {scenarioResult.scenario.lossScenario.allocations.map(allocation => (
                <p key={`loss-${allocation.partyRole}`}>
                  {formatRole(allocation.partyRole)}: {contract.currency} {allocation.amount} - {allocation.basis}
                </p>
              ))}
            </article>
          </div>

          <div className="pls-simulator-notices" aria-label="PLS scenario limitations">
            {scenarioResult.scenario.notices.map(notice => (
              <span key={notice}>{notice}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default PlsScenarioSimulator;
