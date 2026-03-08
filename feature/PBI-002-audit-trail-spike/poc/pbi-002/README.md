# PBI-002 PoC

This PoC demonstrates the minimum evidence pipeline for the spike:

1. load an event JSON file
2. canonicalize it deterministically
3. compute SHA-256 hash
4. append the hash to a daily manifest
5. compute a Merkle root
6. save an evidence bundle
7. verify that a source event still matches the stored evidence

## Files
- `sample_event.json`
- `hash_event.py`
- `verify_manifest.py`

## Run

```bash
python hash_event.py sample_event.json
python verify_manifest.py sample_event.json out/latest/evidence_bundle.json
```

## What this PoC proves

- deterministic event hashing
- reproducible manifest generation
- reproducible Merkle-root generation
- offline verification

## What this PoC does NOT yet prove

- live RFC 3161 timestamp submission
- live WORM storage upload
- live Fabric or public-chain anchoring

Those integrations should be addded only after the ADR is accepted.