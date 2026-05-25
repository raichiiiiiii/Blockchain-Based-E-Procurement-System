export type ProcurementOrderStatus = 'created' | 'accepted' | 'rejected';

export type ProcurementOrder = {
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  title: string;
  description?: string;
  amount: string;
  currency: string;
  status: ProcurementOrderStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  acceptedBy?: string;
  acceptedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  lifecycleEventIds: string[];
  latestLifecyclePayloadHash?: string;
};
