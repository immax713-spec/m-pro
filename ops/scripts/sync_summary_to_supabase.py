#!/usr/bin/env python3
import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path


TABLE_ORDER = ("objects", "sm", "ppr", "suid", "lb", "mgz", "ksg")
TABLE_PREFIXES = {
    "ro_": "objects",
    "sm_": "sm",
    "ppr_": "ppr",
    "suid_": "suid",
    "lb_": "lb",
    "mgz_": "mgz",
    "ksg_": "ksg",
}
TABLE_HEADERS = {
    "objects": [
        "object_id",
        "ro_1_1",
        "ro_1_2",
        "ro_1_3",
        "ro_1_4",
        "ro_1_5",
        "ro_1_6",
        "ro_1_7",
        "ro_1_8",
        "ro_1_9",
        "ro_1_10",
        "ro_1_11",
        "ro_1_12",
        "ro_1_13",
    ],
    "sm": [
        "object_id",
        "sm_1_1",
        "sm_1_2",
        "sm_1_3",
        "sm_1_4",
        "sm_1_5",
        "sm_1_10",
        "sm_1_6",
        "sm_1_9",
        "sm_1_7",
        "sm_1_8",
    ],
    "ppr": [
        "object_id",
        "ppr_1_1",
        "ppr_1_2",
        "ppr_1_3",
        "ppr_1_8",
        "ppr_1_4",
        "ppr_1_5",
        "ppr_1_6",
        "ppr_1_7",
    ],
    "suid": [
        "object_id",
        "suid_1_1",
        "suid_1_2",
        "suid_1_3",
        "suid_2_1",
        "suid_2_2",
        "suid_2_3",
        "suid_3_1",
        "suid_3_2",
        "suid_3_3",
        "suid_4_1",
        "suid_4_2",
        "suid_4_3",
        "suid_5_1",
        "suid_5_2",
        "suid_5_3",
        "suid_5_4",
        "suid_5_5",
    ],
    "lb": [
        "object_id",
        "lb_1_1",
        "lb_1_2",
        "lb_1_3",
        "lb_1_4",
        "lb_1_5",
        "lb_1_6",
        "lb_1_7",
        "lb_1_8",
        "lb_1_9",
        "lb_1_10",
        "lb_1_11",
        "lb_1_12",
    ],
    "mgz": [
        "object_id",
        "mgz_1_3",
        "mgz_1_1",
        "mgz_1_2",
        "mgz_1_4",
        "mgz_1_5",
        "mgz_1_6",
        "mgz_1_7",
    ],
    "ksg": ["object_id", "ksg_group", "ksg_index", "value"],
}
DELETE_TABLE_ORDER = ("ksg", "mgz", "lb", "suid", "ppr", "sm", "objects")
UPLOAD_TABLE_ORDER = ("objects", "sm", "ppr", "suid", "lb", "mgz", "ksg")


def normalize_text(value):
    return "" if value is None else str(value).strip()


def read_csv_rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def detect_csv_path(explicit_path):
    if explicit_path:
        return Path(explicit_path).resolve()
    candidates = list(Path.cwd().glob("*.csv"))
    if not candidates:
        raise SystemExit("CSV file was not found.")
    return max(candidates, key=lambda path: path.stat().st_size)


def table_for_field(field_id):
    for prefix, table_name in TABLE_PREFIXES.items():
        if field_id.startswith(prefix):
            return table_name
    return None


def build_field_catalog(rows):
    field_ids, blocks, labels = rows[0], rows[1], rows[2]
    catalog = []
    ignored_columns = []
    for idx, raw_field_id in enumerate(field_ids):
        field_id = normalize_text(raw_field_id)
        block_name = normalize_text(blocks[idx] if idx < len(blocks) else "")
        label = normalize_text(labels[idx] if idx < len(labels) else "")
        if not field_id:
            if block_name or label:
                ignored_columns.append(
                    {
                        "columnIndex": idx + 1,
                        "blockName": block_name,
                        "label": label,
                        "reason": "missing_field_id",
                    }
                )
            continue
        if field_id == "id_DB":
            ignored_columns.append(
                {
                    "columnIndex": idx + 1,
                    "fieldId": field_id,
                    "blockName": block_name,
                    "label": label,
                    "reason": "service_column",
                }
            )
            continue
        table_name = table_for_field(field_id)
        if not table_name:
            ignored_columns.append(
                {
                    "columnIndex": idx + 1,
                    "fieldId": field_id,
                    "blockName": block_name,
                    "label": label,
                    "reason": "unsupported_prefix",
                }
            )
            continue
        catalog.append(
            {
                "columnIndex": idx + 1,
                "fieldId": field_id,
                "blockName": block_name,
                "label": label,
                "tableName": table_name,
            }
        )
    return catalog, ignored_columns


def row_identity(row_map, row_number):
    uin = normalize_text(row_map.get("ro_1_3"))
    if uin and uin != "Н/Д":
        return "uin:" + uin

    id_db = normalize_text(row_map.get("id_DB"))
    if id_db:
        return "id_db:" + id_db

    code_ds = normalize_text(row_map.get("ro_1_4"))
    object_name = normalize_text(row_map.get("ro_1_5"))
    if code_ds or object_name:
        return "ds_name:" + code_ds + "|" + object_name

    number = normalize_text(row_map.get("ro_1_1"))
    return "row:" + number + "|" + object_name + "|" + str(row_number)


def build_data_rows(rows):
    field_ids = rows[0]
    data_rows = []
    for row_number, row in enumerate(rows[3:], start=4):
        row_map = {}
        for idx, field_id in enumerate(field_ids):
            field_id = normalize_text(field_id)
            if not field_id:
                continue
            row_map[field_id] = normalize_text(row[idx] if idx < len(row) else "")
        data_rows.append(
            {
                "rowNumber": row_number,
                "rowMap": row_map,
                "rowIdentity": row_identity(row_map, row_number),
            }
        )
    return data_rows


def assign_object_ids(data_rows, mapping_file):
    persisted = {}
    if mapping_file.exists():
        persisted = json.loads(mapping_file.read_text(encoding="utf-8"))

    used_ids = {int(value) for value in persisted.values() if str(value).isdigit()}
    next_id = max([1] + list(used_ids)) + 1
    changed = False

    for item in data_rows:
        identity = item["rowIdentity"]
        if identity in persisted and str(persisted[identity]).isdigit():
            continue
        while next_id in used_ids or next_id <= 1:
            next_id += 1
        persisted[identity] = next_id
        used_ids.add(next_id)
        next_id += 1
        changed = True

    if changed or not mapping_file.exists():
        mapping_file.parent.mkdir(parents=True, exist_ok=True)
        mapping_file.write_text(
            json.dumps(dict(sorted(persisted.items())), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return {key: int(value) for key, value in persisted.items()}


def extract_tables(data_rows, object_id_map):
    output = {table_name: [] for table_name in TABLE_ORDER}
    skipped_cells = []

    for item in data_rows:
        row_map = item["rowMap"]
        object_id = object_id_map[item["rowIdentity"]]

        objects_row = {"object_id": object_id}
        for field_name in TABLE_HEADERS["objects"][1:]:
            objects_row[field_name] = normalize_text(row_map.get(field_name))
        output["objects"].append(objects_row)

        for table_name in ("sm", "ppr", "suid", "lb", "mgz"):
            payload = {"object_id": object_id}
            has_value = False
            for field_name in TABLE_HEADERS[table_name][1:]:
                value = normalize_text(row_map.get(field_name))
                payload[field_name] = value
                if value:
                    has_value = True
            if has_value:
                output[table_name].append(payload)

        for field_name, value in row_map.items():
            if not field_name.startswith("ksg_") or not value:
                continue
            parts = field_name.split("_")
            if len(parts) != 3 or not parts[1].isdigit() or not parts[2].isdigit():
                skipped_cells.append(
                    {
                        "rowNumber": item["rowNumber"],
                        "fieldId": field_name,
                        "reason": "bad_ksg_field_id",
                    }
                )
                continue
            output["ksg"].append(
                {
                    "object_id": object_id,
                    "ksg_group": int(parts[1]),
                    "ksg_index": int(parts[2]),
                    "value": value,
                }
            )

    return output, skipped_cells


def write_dict_csv(path, headers, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({header: row.get(header, "") for header in headers})


def write_field_catalog(path, catalog):
    headers = ["sort_order", "field_id", "block_name", "label", "table_name"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        for sort_order, item in enumerate(catalog, start=1):
            writer.writerow(
                {
                    "sort_order": sort_order,
                    "field_id": item["fieldId"],
                    "block_name": item["blockName"],
                    "label": item["label"],
                    "table_name": item["tableName"],
                }
            )


def http_request(method, url, headers, body=None):
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = response.read()
            return json.loads(payload.decode("utf-8")) if payload else None
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: {error.code} {details}") from error


def delete_remote_table(base_url, service_role_key, table_name):
    headers = {
        "apikey": service_role_key,
        "Authorization": "Bearer " + service_role_key,
    }
    url = f"{base_url}/rest/v1/{table_name}?object_id=gt.1"
    http_request("DELETE", url, headers)


def upload_table(base_url, service_role_key, table_name, rows, batch_size):
    if not rows:
        return
    headers = {
        "apikey": service_role_key,
        "Authorization": "Bearer " + service_role_key,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        url = f"{base_url}/rest/v1/{table_name}"
        http_request("POST", url, headers, batch)


def upload_to_supabase(base_url, service_role_key, tables, batch_size):
    for table_name in DELETE_TABLE_ORDER:
        delete_remote_table(base_url, service_role_key, table_name)
    for table_name in UPLOAD_TABLE_ORDER:
        upload_table(base_url, service_role_key, table_name, tables[table_name], batch_size)


def build_report(csv_path, catalog, ignored_columns, data_rows, tables, skipped_cells):
    uins = [normalize_text(item["rowMap"].get("ro_1_3")) for item in data_rows]
    return {
        "csvPath": str(csv_path),
        "fieldCatalogColumns": len(catalog),
        "ignoredColumns": ignored_columns,
        "dataRows": len(data_rows),
        "blankUinRows": sum(1 for uin in uins if not uin),
        "uniqueUins": len({uin for uin in uins if uin and uin != "Н/Д"}),
        "blocks": dict(Counter(item["blockName"] for item in catalog)),
        "tableRowCounts": {table_name: len(rows) for table_name, rows in tables.items()},
        "skippedCells": skipped_cells,
    }


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Convert the fresh summary CSV into Supabase-ready CSV files and optionally upload them.",
    )
    parser.add_argument("--csv", help="Path to the summary CSV. Defaults to the largest CSV in the current directory.")
    parser.add_argument("--out-dir", default="generated/import_bundle")
    parser.add_argument("--mapping-file", default="generated/import_bundle/object_id_map.json")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL", ""))
    parser.add_argument("--service-role-key", default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))
    parser.add_argument("--batch-size", type=int, default=500)
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv or sys.argv[1:])
    csv_path = detect_csv_path(args.csv)
    rows = read_csv_rows(csv_path)
    if len(rows) < 4:
        raise SystemExit("The summary CSV must contain metadata rows plus data rows.")

    catalog, ignored_columns = build_field_catalog(rows)
    data_rows = build_data_rows(rows)
    object_id_map = assign_object_ids(data_rows, Path(args.mapping_file).resolve())
    tables, skipped_cells = extract_tables(data_rows, object_id_map)

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    for table_name in TABLE_ORDER:
        write_dict_csv(out_dir / f"{table_name}.csv", TABLE_HEADERS[table_name], tables[table_name])
    write_field_catalog(out_dir / "field_catalog.csv", catalog)

    report = build_report(csv_path, catalog, ignored_columns, data_rows, tables, skipped_cells)
    if args.upload:
        if not args.supabase_url or not args.service_role_key:
            raise SystemExit("Upload requires --supabase-url and --service-role-key.")
        upload_to_supabase(
            args.supabase_url.rstrip("/"),
            args.service_role_key.strip(),
            tables,
            max(1, int(args.batch_size)),
        )
        report["upload"] = {"status": "ok", "supabaseUrl": args.supabase_url.rstrip("/")}

    (out_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
