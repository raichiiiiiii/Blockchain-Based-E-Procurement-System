import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryShariahReviewRepository } from '../../shariah-review/infrastructure/in-memory-shariah-review-repository.js';
import type { ShariahReview } from '../../shariah-review/domain/shariah-review.js';
import type { ShariahCertificate } from '../../shariah-certification/domain/shariah-certificate.js';
import { InMemoryShariahCertificateRepository } from '../../shariah-certification/infrastructure/in-memory-shariah-certificate-repository.js';
import type { PlsContract } from '../domain/pls-contract.js';
import { InMemoryPlsContractRepository } from '../infrastructure/in-memory-pls-contract-repository.js';
import { activatePlsContract, createPlsDistribution } from './pls-contract-service.js';

function contract(overrides: Partial<PlsContract> = {}): PlsContract {
  return {
    contractId: 'pls-contract-1',
    procurementReference: 'po-local-1002',
    contractTemplateVersion: 'mudarabah-procurement-v1',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    capitalAmount: '68000.00',
    currency: 'MYR',
    profitShare: {
      financierPercent: 60,
      ventureOperatorPercent: 40,
    },
    lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
    status: 'pendingShariahReview',
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
    ...overrides,
  };
}

function review(status: ShariahReview['status'], overrides: Partial<ShariahReview> = {}): ShariahReview {
  return {
    id: 'review-1',
    organizationId: 'demo-supplier-org',
    title: 'Restricted mudarabah review',
    summary: 'Review of procurement-linked PLS seedbed contract.',
    status,
    submittedByUserId: 'demo-shariah-user',
    createdAt: '2026-05-20T10:00:00.000Z',
    decidedAt: status === 'approved' ? '2026-05-21T10:00:00.000Z' : undefined,
    ...overrides,
  };
}

function certificate(overrides: Partial<ShariahCertificate> = {}): ShariahCertificate {
  return {
    certificateId: 'certificate-1',
    issuedBy: 'MVP Shariah Governance Board',
    reviewerBoard: 'Restricted PLS Review Panel',
    fatwaReference: 'FATWA-MVP-001',
    scope: 'restricted-pls-seedbed',
    contractTemplateVersion: 'mudarabah-procurement-v1',
    conditions: ['No guaranteed profit or principal'],
    issuedAt: '2026-05-20T00:00:00.000Z',
    expiresAt: '2027-05-20T00:00:00.000Z',
    status: 'active',
    certificateHash: 'sha256:test-certificate-hash',
    createdByUserId: 'demo-shariah-user',
    createdAt: '2026-05-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('PLS contract service', () => {
  it('activates a contract only when an approved Shariah review reference exists', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract()]);
    const shariahReviewRepository = new InMemoryShariahReviewRepository();
    await shariahReviewRepository.save(review('approved'));

    const result = await activatePlsContract({
      contractId: 'pls-contract-1',
      shariahReviewId: 'review-1',
    }, {
      contractRepository,
      shariahReviewRepository,
      now: () => '2026-05-22T08:00:00.000Z',
    });

    assert.strictEqual(result.status, 'activated');
    if (result.status !== 'activated') {
      assert.fail('Expected contract activation');
    }

    assert.strictEqual(result.contract.status, 'active');
    assert.strictEqual(result.contract.shariahApproval?.reviewId, 'review-1');
    assert.strictEqual(result.contract.shariahApproval?.status, 'approved');
    assert.strictEqual(result.contract.activatedAt, '2026-05-22T08:00:00.000Z');
  });

  it('requires an active Shariah certificate when certificate repository is wired', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract()]);
    const shariahReviewRepository = new InMemoryShariahReviewRepository([review('approved')]);
    const shariahCertificateRepository = new InMemoryShariahCertificateRepository([certificate()]);

    const missingCertificateResult = await activatePlsContract({
      contractId: 'pls-contract-1',
      shariahReviewId: 'review-1',
    }, {
      contractRepository,
      shariahReviewRepository,
      shariahCertificateRepository,
      now: () => '2026-05-22T08:00:00.000Z',
    });

    assert.strictEqual(missingCertificateResult.status, 'certificateBlocked');

    const activatedResult = await activatePlsContract({
      contractId: 'pls-contract-1',
      shariahReviewId: 'review-1',
      shariahCertificateId: 'certificate-1',
    }, {
      contractRepository,
      shariahReviewRepository,
      shariahCertificateRepository,
      now: () => '2026-05-22T08:00:00.000Z',
    });

    assert.strictEqual(activatedResult.status, 'activated');
    if (activatedResult.status !== 'activated') {
      assert.fail('Expected activation with certificate artifact');
    }

    assert.strictEqual(activatedResult.contract.shariahCertificate?.certificateId, 'certificate-1');
    assert.strictEqual(activatedResult.contract.shariahCertificate?.certificateHash, 'sha256:test-certificate-hash');
  });

  it('blocks activation when Shariah certificate is revoked, expired, or for another template', async () => {
    const shariahReviewRepository = new InMemoryShariahReviewRepository([review('approved')]);

    for (const [scenario, blockedCertificate, expectedReason] of [
      ['revoked', certificate({ status: 'revoked' }), 'inactive'],
      ['expired', certificate({ expiresAt: '2026-01-01T00:00:00.000Z' }), 'expired'],
      ['template mismatch', certificate({ contractTemplateVersion: 'another-template-v1' }), 'templateMismatch'],
    ] as const) {
      const result = await activatePlsContract({
        contractId: 'pls-contract-1',
        shariahReviewId: 'review-1',
        shariahCertificateId: 'certificate-1',
      }, {
        contractRepository: new InMemoryPlsContractRepository([contract()]),
        shariahReviewRepository,
        shariahCertificateRepository: new InMemoryShariahCertificateRepository([blockedCertificate]),
        now: () => '2026-05-22T08:00:00.000Z',
      });

      assert.strictEqual(result.status, 'certificateBlocked', scenario);
      if (result.status !== 'certificateBlocked') {
        assert.fail(`Expected certificate block for ${scenario}`);
      }
      assert.strictEqual(result.reason, expectedReason);
    }
  });

  it('blocks activation for rejected or conditional Shariah review decisions', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract()]);
    const shariahReviewRepository = new InMemoryShariahReviewRepository();
    await shariahReviewRepository.save(review('conditionalApproved'));

    const result = await activatePlsContract({
      contractId: 'pls-contract-1',
      shariahReviewId: 'review-1',
    }, {
      contractRepository,
      shariahReviewRepository,
    });

    assert.strictEqual(result.status, 'activationBlocked');
    if (result.status !== 'activationBlocked') {
      assert.fail('Expected activation to be blocked');
    }
    assert.strictEqual(result.approvalStatus, 'conditionalApproved');
  });

  it('blocks activation when a contract party is not eligible', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract()]);
    const shariahReviewRepository = new InMemoryShariahReviewRepository();
    await shariahReviewRepository.save(review('approved'));

    const result = await activatePlsContract({
      contractId: 'pls-contract-1',
      shariahReviewId: 'review-1',
    }, {
      contractRepository,
      shariahReviewRepository,
      eligibilityGateway: {
        async checkOrganizationEligibility(memberOrganizationId) {
          return {
            memberOrganizationId,
            eligibility: memberOrganizationId === 'demo-supplier-org' ? 'blocked' : 'eligible',
          };
        },
      },
    });

    assert.strictEqual(result.status, 'notEligible');
    if (result.status !== 'notEligible') {
      assert.fail('Expected activation to be blocked by eligibility');
    }
    assert.strictEqual(result.party, 'supplier');
    assert.strictEqual(result.eligibility.eligibility, 'blocked');
  });

  it('reproduces profit allocation for the restricted PLS seedbed scenario', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract({ status: 'active' })]);

    const result = await createPlsDistribution({
      contractId: 'pls-contract-1',
      eventType: 'profit',
      grossResultAmount: '10000.00',
      calculationBasis: 'Accepted order margin scenario.',
      createdBy: 'demo-financier-user',
    }, {
      contractRepository,
      idGenerator: () => 'distribution-profit-1',
      now: () => '2026-05-22T09:00:00.000Z',
    });

    assert.strictEqual(result.status, 'created');
    if (result.status !== 'created') {
      assert.fail('Expected distribution to be created');
    }

    assert.strictEqual(result.distribution.allocations[0].amount, '6000.00');
    assert.strictEqual(result.distribution.allocations[1].amount, '4000.00');
  });

  it('reproduces loss allocation without guaranteeing principal or profit', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract({ status: 'active' })]);

    const result = await createPlsDistribution({
      contractId: 'pls-contract-1',
      eventType: 'loss',
      grossResultAmount: '5000.00',
      calculationBasis: 'Loss scenario after accepted operating costs.',
      createdBy: 'demo-financier-user',
    }, {
      contractRepository,
      idGenerator: () => 'distribution-loss-1',
      now: () => '2026-05-22T09:30:00.000Z',
    });

    assert.strictEqual(result.status, 'created');
    if (result.status !== 'created') {
      assert.fail('Expected distribution to be created');
    }

    assert.strictEqual(result.distribution.grossResultAmount, '-5000.00');
    assert.strictEqual(result.distribution.allocations[0].amount, '-5000.00');
    assert.strictEqual(result.distribution.allocations[1].amount, '0.00');
  });

  it('does not record a distribution before the contract is active', async () => {
    const contractRepository = new InMemoryPlsContractRepository([contract()]);

    const result = await createPlsDistribution({
      contractId: 'pls-contract-1',
      eventType: 'profit',
      grossResultAmount: '10000.00',
      calculationBasis: 'Attempted pre-activation distribution.',
      createdBy: 'demo-financier-user',
    }, {
      contractRepository,
    });

    assert.strictEqual(result.status, 'inactiveContract');
  });
});
