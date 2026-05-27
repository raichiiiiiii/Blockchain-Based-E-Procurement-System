# Production Fabric Consortium Templates

These files stage the production-extension Fabric foundation for the Digital Procurement and PLS Seedbed.

They are templates only. They do not include certificates, private keys, CA material, peer/orderer binaries, production network artifacts, or live deployment claims.

Files:

- `channel-plan.json`: participant, channel, endorsement, and operations plan.
- `chaincode-definitions.json`: intended chaincode modules and lifecycle metadata.
- `collections-config.json`: private data collection template for proof hashes and metadata.
- `connection-profile-template.yaml`: gateway connection-profile shape with placeholder endpoints and certificate paths.

Use `scripts/fabric/check-production-consortium-prereqs.ps1` to validate the local prerequisite surface and `scripts/fabric/production-chaincode-lifecycle-skeleton.ps1` to print lifecycle command skeletons for operators.
