# PBI-099: User Identity and Membership Lookup Boundary Options

Status: Analysis artifact  
Owner: Engineering / Architecture  
Last updated: 2026-03-25

## 1. Problem framing

As established in PBI-098, the current role assignment validation has a critical gap: it cannot validate that users exist or that users belong to organizations. This creates a risk where role assignments could be created for non-existent users or users not belonging to the target organization.

The validation gap consists of two distinct lookup requirements:

1. **User existence lookup**: Validate that a provided `userId` represents a real existing user in the system
2. **Organization membership lookup**: Validate that a user belongs to a specific organization

These are separate concerns with potentially different ownership and implementation approaches.

## 2. Ownership candidates

### User lookup ownership candidates

**Likely owners:**
- **Membership module**: If users are modeled as members of organizations, this module would logically own user existence
- **Dedicated identity module**: If introduced, would own all user identity concerns
- **Shared module**: For cross-cutting identity primitives

**Likely consumers:**
- **Access-control module**: Needs user lookup for role assignment validation
- **Shariah-review module**: Would need user lookup for submission validation

### Organization-membership lookup ownership candidates

**Likely owners:**
- **Membership module**: Logically owns the relationship between users and organizations
- **Dedicated identity module**: If user-to-organization relationships are part of identity management
- **Shared module**: For cross-cutting membership primitives

**Likely consumers:**
- **Access-control module**: Needs membership lookup for role assignment validation

## 3. Boundary options matrix

| Option | Description | Pros | Cons | Repo-fit |
|--------|-------------|------|------|----------|
| **Repository interface pattern** | Introduce new repository interfaces in shared, implemented by membership module | - Consistent with existing patterns<br>- Clear separation of concerns<br>- Easy to mock for testing<br>- Minimal architectural change | - Requires new shared interfaces<br>- Potential circular dependency risks | High - matches existing role/organization pattern |
| **Service layer abstraction** | Create lookup services that access repositories | - Encapsulates lookup logic<br>- Can combine multiple data sources | - More complex than direct repository access<br>- Additional layer overhead | Medium - introduces new service layer |
| **Shared kernel pattern** | Place lookup interfaces directly in shared module | - Simplest integration<br>- No new modules needed | - Pollutes shared module<br>- Tightly couples modules | Low - violates clean architecture principles |
| **Port/adapter pattern** | Define ports in access-control, adapters in membership | - Clear dependency direction<br>- Flexible implementation | - Requires more setup<br>- New pattern in repo | Medium - introduces new architectural concept |

## 4. Multiplicity impact note

Several multiplicity questions affect the lookup ownership and contract shape:

1. **User-to-organization relationship**:
   - Can a user belong to multiple organizations?
   - Is membership direct or role-based?
   - How does membership status affect assignment eligibility?

2. **User identity model**:
   - Are users internal system users or member organization users?
   - Is there a distinction between authentication identity and system user identity?

3. **Membership lifecycle**:
   - Can membership be deactivated/revoked?
   - How does membership status history affect current assignments?

4. **Lookup performance**:
   - Are lookup operations expected to be high-volume?
   - Do lookups need to support batching or caching?

These questions affect the contract design but should not be decided in this analysis phase.

## 5. Recommendation

**Recommended approach**: Repository interface pattern with membership module ownership

**Justification**:
1. **Consistency**: Matches the existing pattern used for role and organization repositories
2. **Separation of concerns**: Membership module logically owns both users and user-to-organization relationships
3. **Dependency direction**: Maintains proper architectural flow from access-control (consumer) to membership (owner)
4. **Testability**: Repository interfaces are easy to mock in tests
5. **Minimal change**: Requires only adding new interfaces, no architectural restructuring

**Implementation approach**:
1. Define `UserRepository` and `MembershipRepository` interfaces in the shared module
2. Place implementations in the membership module
3. Inject repositories into the access-control module's assignment service

This approach keeps the architectural boundaries clean while following established patterns.

## 6. Handoff to PBI-100

**PBI-100 must formalize:**
- Exact contract definitions for user and membership lookup interfaces
- Repository method signatures and return types
- Error handling approach for lookup failures
- Integration approach with existing repository patterns
- Documentation of the chosen architectural boundary

**Must not be implemented before that proposal is approved:**
- No user lookup interfaces or implementations
- No membership lookup interfaces or implementations
- No modifications to role assignment validation logic
- No placeholder or mock lookup implementations
