import { z } from "zod";

export const plsContractTypeEnum = z.enum([
  "RESTRICTED_SINGLE_VENTURE_MUDARABAH",
]);

export const plsReviewStatusEnum = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED_WITH_CONDITIONS",
  "APPROVED",
  "REJECTED",
]);

export const distributionApprovalStatusEnum = z.enum([
  "NOT_REQUIRED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const lossAllocationRuleEnum = z.enum([
  "RABB_AL_MAL_BEARS_LOSS_UNLESS_MUDARIB_FAULT",
]);

export const profitCalculationBasisEnum = z.enum([
  "REALIZED_PROFIT_LESS_APPROVED_DEDUCTIBLE_COSTS",
]);

export const plsContractPersistenceSchema = z
  .object({
    contractId: z.string().min(1),
    contractType: plsContractTypeEnum,
    procurementReferenceId: z.string().min(1),

    ventureDescription: z.string().min(1),
    permittedUseOfFunds: z.string().min(1),

    rabbAlMalPartyId: z.string().min(1),
    mudaribPartyId: z.string().min(1),

    capitalAmount: z.number().positive(),
    currency: z.string().min(1).max(10),

    profitSharingRatioRabbAlMal: z.number().min(0).max(1),
    profitSharingRatioMudarib: z.number().min(0).max(1),

    approvedProfitDefinition: z.string().min(1),
    deductibleCostPolicyVersion: z.string().min(1),

    restrictions: z.record(z.string(), z.unknown()),
    comminglingFlag: z.boolean(),

    profitCalculationBasis: profitCalculationBasisEnum,
    lossAllocationRule: lossAllocationRuleEnum,

    distributionPeriodStart: z.string().date(),
    distributionPeriodEnd: z.string().date(),

    evidenceBundleId: z.string().min(1).optional().nullable(),
    distributionApprovalStatus: distributionApprovalStatusEnum,
    exceptionFlag: z.boolean(),

    securityOrCollateralDetails: z.string().optional().nullable(),

    reviewer: z.string().min(1).optional().nullable(),
    reviewStatus: plsReviewStatusEnum,
    reviewDate: z.string().date().optional().nullable(),
    shariahPronouncementReference: z.string().min(1).optional().nullable(),

    templateVersion: z.string().min(1),
    templateHash: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const total =
      Number(data.profitSharingRatioRabbAlMal) +
      Number(data.profitSharingRatioMudarib);

    if (Math.abs(total - 1) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profitSharingRatioRabbAlMal"],
        message: "Profit-sharing ratios must total 1.0000",
      });
    }

    if (data.distributionPeriodEnd < data.distributionPeriodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["distributionPeriodEnd"],
        message:
          "distributionPeriodEnd must be greater than or equal to distributionPeriodStart",
      });
    }
  });

export type PlsContractPersistenceInput = z.infer<
  typeof plsContractPersistenceSchema
>;