# Orderer `orderer.yaml` Override Notes

The Docker Compose lab template sets orderer configuration through environment
variables rather than committing generated `orderer.yaml` files.

The first local production-like lab uses:

- three orderer containers: `orderer1`, `orderer2`, `orderer3`
- `ORDERER_CHANNELPARTICIPATION_ENABLED=true`
- TLS enabled for general and admin endpoints
- external workspace mounts for MSP, TLS material, and ledger volumes

Before live use, verify:

- orderer MSP and TLS material were generated outside the repository
- Raft consenters in `configtx.yaml` match the orderer hostnames and TLS certs
- admin TLS root certificates are available to the operator shell
- channel join/create evidence is recorded outside the repository first, then
  sanitized before copying into docs

Do not commit orderer MSPs, TLS private keys, ledger volumes, channel blocks, or
environment-specific admin certificates.
