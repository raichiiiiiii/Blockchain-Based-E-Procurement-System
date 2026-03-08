import json
import sys
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: normalize(value[k]) for k in sorted(value.keys())}
    if isinstance(value, list):
        return [normalize(v) for v in value]
    if isinstance(value, Decimal):
        s = format(value, "f")
        if "." in s:
            s = s.rstrip("0").rstrip(".")
        return s
    return value


def load_json(path: Path) -> Any:
    text = path.read_text(encoding="utf-8")
    return json.loads(text, parse_float=Decimal)


def canonical_json_bytes(obj: Any) -> bytes:
    normalized = normalize(obj)
    return json.dumps(
        normalized,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":")
    ).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def merkle_root(hashes: List[str]) -> str:
    if not hashes:
        return sha256_hex(b"")
    level = [bytes.fromhex(h) for h in hashes]
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        next_level = []
        for i in range(0, len(level), 2):
            combined = level[i] + level[i + 1]
            next_level.append(hashlib.sha256(combined).digest())
        level = next_level
    return level[0].hex()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python hash_event.py <event.json>")
        return 1

    event_path = Path(sys.argv[1]).resolve()
    if not event_path.exists():
        print(f"File not found: {event_path}")
        return 1

    event = load_json(event_path)
    canonical = canonical_json_bytes(event)
    event_hash = sha256_hex(canonical)

    now = datetime.now(timezone.utc)
    bundle_date = now.strftime("%Y-%m-%d")
    out_dir = Path("out") / bundle_date
    ensure_dir(out_dir)

    event_hashes_file = out_dir / "event_hashes.json"
    if event_hashes_file.exists():
        existing = json.loads(event_hashes_file.read_text(encoding="utf-8"))
        event_hashes = existing.get("event_hashes", [])
    else:
        event_hashes = []

    if event_hash not in event_hashes:
        event_hashes.append(event_hash)

    event_hashes_file.write_text(
        json.dumps({"event_hashes": event_hashes}, indent=2),
        encoding="utf-8"
    )

    root = merkle_root(event_hashes)

    evidence_bundle: Dict[str, Any] = {
        "bundle_id": f"bundle-{bundle_date}",
        "bundle_date": bundle_date,
        "event_count": len(event_hashes),
        "event_hashes": event_hashes,
        "merkle_root": root,
        "timestamp_token_reference": None,
        "storage_location": None,
        "generator_version": "poc-0.1.0",
        "generated_at": now.isoformat(),
        "last_event_file": str(event_path.name),
        "last_event_hash": event_hash
    }

    bundle_path = out_dir / "evidence_bundle.json"
    bundle_path.write_text(json.dumps(evidence_bundle, indent=2), encoding="utf-8")

    latest_dir = Path("out") / "latest"
    ensure_dir(latest_dir)
    (latest_dir / "evidence_bundle.json").write_text(
        json.dumps(evidence_bundle, indent=2),
        encoding="utf-8"
    )

    print("Event hash:", event_hash)
    print("Merkle root:", root)
    print("Evidence bundle:", bundle_path)
    print("")
    print("Next integration steps:")
    print("- submit merkle_root to RFC 3161 TSA")
    print("- store evidence bundle in immutable object storage")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())