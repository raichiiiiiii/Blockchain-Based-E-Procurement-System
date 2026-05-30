# Peer `core.yaml` Override Notes

The Docker Compose lab template sets peer configuration through environment
variables rather than committing generated `core.yaml` files.

For each peer, verify these values before live use:

- `CORE_PEER_LOCALMSPID` matches the organization MSP.
- `CORE_PEER_MSPCONFIGPATH` points to mounted external workspace MSP material.
- `CORE_PEER_TLS_ENABLED=true`.
- TLS cert, key, and root cert paths point to mounted external workspace TLS material.
- `CORE_LEDGER_STATE_STATEDATABASE=goleveldb` for the first proof-only lab.
- `CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=pbi438-fabric-lab` so chaincode containers can reach peers.
- Operations/metrics ports can be added later after the one-host lab is stable.

Do not commit generated `core.yaml`, peer MSPs, TLS private keys, or ledger
volumes.
