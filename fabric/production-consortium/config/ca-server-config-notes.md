# Fabric CA Server Config Notes

The Compose template starts one CA per required organization:

- `ca.orderer`
- `ca.platform`
- `ca.buyer`
- `ca.supplier`
- `ca.financier`
- `ca.regulatorauditor`

Bootstrap IDs and secrets must be supplied by the operator through environment
variables or an untracked `.env` file outside this repository. Do not use real
production secrets in committed files.

Generated CA state belongs under:

```text
$FABRIC_PRODUCTION_LAB_WORKSPACE/crypto/fabric-ca/<org>
```

The bootstrap/enrollment script expects each CA to expose a TLS CA certificate
at the matching external workspace CA directory after startup. If your Fabric CA
image writes a different path, adjust the operator-local environment and record
the change in the external evidence folder.

Do not commit CA admin secrets, CA databases, generated CA private keys, MSP
keystores, TLS private keys, or real connection profiles.
