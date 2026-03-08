import json
import sys
import hashlib
from pathlib import Path
from decimal import Decimal
from typing import Any


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


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python verify_manifest.py <event.json> <evidence_bundle.json>")
        return 1

    event_path = Path(sys.argv[1]).resolve()
    bundle_path = Path(sys.argv[2]).resolve()

    if not event_path.exists():
        print(f"Event file not found: {event_path}")
        return 1
    if not bundle_path.exists():
        print(f"Bundle file not found: {bundle_path}")
        return 1

    event = load_json(event_path)
    bundle = load_json(bundle_path)

    event_hash = sha256_hex(canonical_json_bytes(event))
    event_hashes = bundle.get("event_hashes", [])

    if event_hash in event_hashes:
        print("Verification PASSED")
        print("Event hash exists in evidence bundle.")
        print("Event hash:", event_hash)
        print("Bundle ID:", bundle.get("bundle_id"))
        return 0

    print("Verification FAILED")
    print("Event hash does not exist in evidence bundle.")
    print("Event hash:", event_hash)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())