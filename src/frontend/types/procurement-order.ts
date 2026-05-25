export type ProcurementOrderStatus = 'created' | 'accepted' | 'rejected';

export type ProcurementOrderResponse = {
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
  lifecycleEventIds: string[];
  latestLifecyclePayloadHash?: string;
};

export type CreateProcurementOrderRequest = {
  supplierOrganizationId: string;
  title: string;
  description?: string;
  amount: string;
  currency: string;
};

export type AcknowledgeProcurementOrderRequest = {
  decision: 'accept' | 'reject';
};
