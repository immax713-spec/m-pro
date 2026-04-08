from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path


def normalize_text(value: str | None) -> str:
    return str(value or "").strip()


def normalize_role(value: str | None) -> str:
    text = normalize_text(value)
    return text or "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to AuthorizationPage.csv")
    parser.add_argument("--function-url", required=True, help="Supabase Edge Function URL")
    parser.add_argument("--secret", required=True, help="Import secret")
    parser.add_argument("--batch-size", type=int, default=4, help="Users per request")
    return parser.parse_args()


def load_users(csv_path: Path) -> list[dict[str, object]]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        users: list[dict[str, object]] = []
        for row in reader:
            name = normalize_text(row.get("Inspector"))
            password = str(row.get("Password") or "")
            if not name or not password:
                continue
            users.append(
                {
                    "name": name,
                    "password": password,
                    "role": normalize_role(row.get("Rights")),
                    "division": normalize_text(row.get("Division")),
                    "isActive": True,
                }
            )
        return users


def post_batch(function_url: str, secret: str, batch: list[dict[str, object]]) -> dict[str, object]:
    request = urllib.request.Request(
        function_url,
        data=json.dumps({"users": batch}).encode("utf-8"),
        method="POST",
        headers={
            "content-type": "application/json; charset=utf-8",
            "x-import-secret": secret,
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv).resolve()
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        return 1

    users = load_users(csv_path)
    if not users:
        print("No users found in CSV", file=sys.stderr)
        return 1

    batch_size = max(1, int(args.batch_size or 4))
    results: list[dict[str, object]] = []

    try:
        for index in range(0, len(users), batch_size):
            batch = users[index:index + batch_size]
            payload = post_batch(args.function_url, args.secret, batch)
            results.append(payload)
            print(
                f"batch {index // batch_size + 1}: "
                f"created={payload.get('createdCount', 0)} "
                f"updated={payload.get('updatedCount', 0)} "
                f"skipped={payload.get('skippedCount', 0)}"
            )
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        print(details or str(exc), file=sys.stderr)
        return 1

    summary = {
        "chunks": len(results),
        "created": sum(int(item.get("createdCount", 0)) for item in results),
        "updated": sum(int(item.get("updatedCount", 0)) for item in results),
        "skipped": sum(int(item.get("skippedCount", 0)) for item in results),
        "results": results,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
