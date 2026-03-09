# Here more diagrams in the form of plantuml text to add more context
[comment]: <> (this diagram are taken from .\\feature\\PBI-002-audit-trail-spike\\adrs\\diagrams\\)

`auditor-verification.puml`

```puml
@startuml
title ADR-2026-002 - UML Sequence Diagram - Auditor Verification

actor Auditor
participant "Verification Component" as Verifier
database "Immutable / WORM Storage" as WORM
participant "RFC 3161 Timestamp Authority" as TSA

Auditor -> Verifier : verify(eventRecord, bundleId)
Verifier -> Verifier : canonicalize(eventRecord)
Verifier -> Verifier : recompute SHA-256 event hash
Verifier -> WORM : read(bundleId)
WORM --> Verifier : evidence bundle, manifest,\nMerkle data, timestamp token
Verifier -> Verifier : verify manifest inclusion
Verifier -> Verifier : recompute Merkle path/root
Verifier -> TSA : validate(timestampToken, merkleRoot)
TSA --> Verifier : validation result
Verifier --> Auditor : verification result\n(integrity, inclusion, timestamp validity)

@enduml
```

`bundle-creation-and-retention.puml`

```puml
@startuml
title ADR-2026-002 - UML Sequence Diagram - Bundle Creation and Retention

actor "Procure-to-Pay System" as P2P
participant "Canonicalization Component" as Canonicalizer
participant "Hashing Component" as Hasher
participant "Daily Manifest Component" as ManifestBuilder
participant "Merkle Root Component" as MerkleBuilder
participant "RFC 3161 Timestamp Authority" as TSA
participant "Evidence Bundle Assembler" as BundleAssembler
database "Immutable / WORM Storage" as WORM

P2P -> Canonicalizer : submitAuditEvent(event)
Canonicalizer -> Canonicalizer : canonicalize(event)
Canonicalizer -> Hasher : hash(canonicalJson)
Hasher --> ManifestBuilder : eventHash
ManifestBuilder -> ManifestBuilder : appendToDailyManifest(eventHash)

group Daily manifest finalization
  ManifestBuilder -> MerkleBuilder : computeRoot(manifestHashes)
  MerkleBuilder --> ManifestBuilder : merkleRoot
  ManifestBuilder -> TSA : timestamp(merkleRoot)
  TSA --> ManifestBuilder : timestampToken
  ManifestBuilder -> BundleAssembler : assembleBundle(manifest, merkleRoot, timestampToken)
  BundleAssembler -> WORM : store(bundle)
  WORM --> BundleAssembler : storageReference
end

@enduml
```

`centralized-evidence-pipeline-mvp.puml`

```puml
@startuml
title ADR-2026-002 - UML Component Diagram - Centralized Evidence Pipeline MVP

skinparam componentStyle uml2
left to right direction

package "Procure-to-Pay Platform" {
  [Event Producer] as EventProducer
}

package "Evidence Service" {
  [Canonicalization Component] as Canonicalizer
  [Hashing Component] as Hasher
  [Daily Manifest Component] as ManifestBuilder
  [Merkle Root Component] as MerkleBuilder
  [Evidence Bundle Assembler] as BundleAssembler
  [Verification Component] as Verifier
}

package "External Services" {
  [RFC 3161 Timestamp Authority] as TSA
  [Immutable / WORM Storage] as WORM
}

package "Consumers" {
  [Auditor] as Auditor
}

EventProducer --> Canonicalizer : audit event
Canonicalizer --> Hasher : canonical JSON
Hasher --> ManifestBuilder : SHA-256 event hash
ManifestBuilder --> MerkleBuilder : daily manifest entries
MerkleBuilder --> BundleAssembler : manifest root
TSA --> BundleAssembler : timestamp token
BundleAssembler --> WORM : evidence bundle
Auditor --> Verifier : verification request
Verifier --> WORM : read evidence bundle / proofs
Verifier --> TSA : validate timestamp token

package "Deferred Post-MVP Enhancement" {
  [Fabric / Hybrid Anchoring Adapter] as FabricAdapter
}

MerkleBuilder ..> FabricAdapter : deferred anchoring of manifest root

@enduml
```

`centralized-mvp-deployment.puml`

```puml
@startuml
title ADR-2026-002 - UML Deployment Diagram - Centralized MVP Deployment

node "Enterprise Environment" {
  node "Procure-to-Pay Application Node" as AppNode {
    artifact "Event Producer" as EventProducerArtifact
  }

  node "Evidence Service Node" as EvidenceNode {
    artifact "Canonicalization Component" as CanonicalizerArtifact
    artifact "Hashing Component" as HasherArtifact
    artifact "Daily Manifest Component" as ManifestArtifact
    artifact "Merkle Root Component" as MerkleArtifact
    artifact "Evidence Bundle Assembler" as BundleArtifact
    artifact "Verification Component\n(API / CLI / library)" as VerifierArtifact
  }
}

node "Trusted External Service" as TSANode {
  artifact "RFC 3161 TSA Service" as TSAArtifact
}

node "Immutable Retention Platform" as WORMNode {
  artifact "WORM Object Store / Immutable Repository" as WORMArtifact
}

node "Auditor Workstation" as AuditorNode {
  artifact "Auditor Client" as AuditorArtifact
}

EventProducerArtifact -- CanonicalizerArtifact
CanonicalizerArtifact -- HasherArtifact
HasherArtifact -- ManifestArtifact
ManifestArtifact -- MerkleArtifact
MerkleArtifact -- BundleArtifact
BundleArtifact -- TSAArtifact
BundleArtifact -- WORMArtifact
AuditorArtifact -- VerifierArtifact
VerifierArtifact -- WORMArtifact
VerifierArtifact -- TSAArtifact

node "Deferred Post-MVP Node" as FabricNode {
  artifact "Fabric / Hybrid Anchoring Adapter" as FabricArtifact
}

MerkleArtifact .. FabricArtifact : deferred root anchoring

@enduml
```

`evidence-generator-flow.puml`

```puml
@startuml
title ADR-2026-002 - UML Activity Diagram - Evidence Generation Flow

start

:Receive procure-to-pay audit event;
:Normalize event fields;
:Produce canonical JSON;
:Compute SHA-256 event hash;
:Append event hash to daily evidence manifest;

if (End of bundle window/day?) then (yes)
  :Compute Merkle tree from manifest hashes;
  :Derive manifest root;
  :Submit manifest root to RFC 3161 TSA;
  :Receive timestamp token;
  :Assemble evidence bundle\n(bundle metadata, hashes,\nMerkle root, timestamp reference);
  :Write evidence bundle to immutable / WORM storage;
else (no)
  :Persist updated manifest state;
endif

:Make verification logic available\n(API / CLI / library);

stop
@enduml
```