# PBI-100: Identity and Membership Lookup Contract Proposal

Status: Approved contract proposal  
Owner: Engineering / Architecture  
Last updated: 2026-03-25

## 1. Problem framing

As established in PBI-098, the current role assignment validation has critical gaps that prevent validating:
1. **Invalid user validation** - Cannot verify that a provided `userId` represents a real existing user
2. **Non-member validation** - Cannot verify that a user belongs to a specified organization

These validation gaps create risks where role assignments could be created for non-existent users or users not belonging to the target organization.

This proposal must stay minimal and executable because:
- It serves as the contract foundation for PBI-101 and PBI-102 implementation
- It must align with existing repository patterns in the codebase
- It should not introduce complex entity models or extensive API surface
- It needs to unblock PBI-050 without over-engineering

## 2. Proposed minimal contracts

We propose two minimal application-level lookup interfaces to address the validation gaps:

### UserExistenceLookup Interface
```typescript
interface UserExistenceLookup {
  userExists(userId: string): Promise<boolean>;
}
```

### OrganizationMembershipLookup Interface
```typescript
interface OrganizationMembershipLookup {
  isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean>;
}
```

## 3. Method semantics

### userExists(userId: string): Promise<boolean>
- **True**: The user with the provided `userId` exists in the system
- **False**: No user with the provided `userId` exists
- **Error handling**: May throw on infrastructure failures (database connection issues, etc.)
- **Business outcomes**: Non-existence is represented as `false` return value, not as an exception

### isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean>
- **True**: The user with `userId` has an active membership with the organization identified by `organizationId`
- **False**: Either the user doesn't exist, the organization doesn't exist, or the user is not an active member of the organization
- **Error handling**: May throw on infrastructure failures (database connection issues, etc.)
- **Business outcomes**: Non-membership is represented as `false` return value, not as an exception

### General semantics
- Both methods should only throw exceptions for infrastructure failures
- All business logic outcomes (user not found, not a member, etc.) should be represented in return values
- Methods should not expose rich entity models unless strictly necessary for their operation

## 4. Ownership note

Based on the analysis in PBI-099, we establish the following ownership boundaries:

- **Consumer**: The access-control module consumes these lookup interfaces for role assignment validation
- **Preferred adapter boundary**: The membership module is the preferred owner for implementing these interfaces in the near term
- **Long-term ownership**: Broader user identity ownership and management remains provisional and is not finalized in this proposal

This ownership model aligns with:
- The existing repository pattern used for roles and organizations
- The logical ownership of user-to-organization relationships by the membership module
- The dependency direction from access-control (consumer) to membership (owner)

## 5. Follow-up mapping

### PBI-101 must create:
- `UserExistenceLookup` interface in the shared module following the existing repository pattern
- `OrganizationMembershipLookup` interface in the shared module following the existing repository pattern
- Documentation of these interfaces in the architecture documents

### PBI-102 must implement:
- In-memory test implementations of both interfaces in the membership module for testing purposes
- Integration of these interfaces with existing test infrastructure
- Basic validation that the interfaces can be injected into access-control services

### PBI-050 resumes after:
- The lookup interfaces are defined (PBI-101)
- Test implementations are available (PBI-102)
- These interfaces can be injected into the role assignment service
- The service can validate user existence and membership before creating assignments

## 6. Explicit exclusions

This proposal explicitly does not include:
- Runtime adapter code implementation
- Placeholder or fake validation logic
- Full user entity model definition
- Final multiplicity decisions (e.g., whether users can belong to multiple organizations)
- Complex error hierarchies beyond infrastructure failure handling
- Authentication or authorization logic
- User provisioning or lifecycle management APIs
