import os
import sys
import gzip
import shutil
import sqlite3
import hashlib

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'enterprise.db')
BACKUPS_DIR = os.path.join(BASE_DIR, 'backups')

def restore_latest_backup():
    print("=" * 68)
    print("  GOLDEN GLOBAL EXPO — DISASTER RECOVERY RESTORE UTILITY")
    print("=" * 68)

    if not os.path.exists(BACKUPS_DIR):
        print("[ERROR] No backups directory found.")
        sys.exit(1)

    backups = sorted([
        f for f in os.listdir(BACKUPS_DIR) if f.startswith('enterprise_backup_') and f.endswith('.db.gz')
    ])
    if not backups:
        print("[ERROR] No backup archives found in backups/")
        sys.exit(1)

    latest_backup = backups[-1]
    gz_path = os.path.join(BACKUPS_DIR, latest_backup)
    chk_path = gz_path + ".sha256"

    print(f"1. Selected latest backup snapshot: {latest_backup}")

    # Verify SHA-256 checksum if available
    if os.path.exists(chk_path):
        print(f"2. Verifying SHA-256 cryptographic checksum...")
        with open(chk_path, 'r', encoding='utf-8') as f:
            expected_sha = f.read().split()[0].strip()

        hasher = hashlib.sha256()
        with open(gz_path, 'rb') as f:
            hasher.update(f.read())
        actual_sha = hasher.hexdigest()

        if actual_sha != expected_sha:
            print(f"[CRITICAL ERROR] Checksum mismatch! Expected {expected_sha}, got {actual_sha}")
            sys.exit(1)
        print("   [PASS] Cryptographic checksum verified.")

    # Decompress to temporary file
    temp_restored = os.path.join(DATA_DIR, "enterprise_restored_temp.db")
    print(f"3. Decompressing backup archive...")
    with gzip.open(gz_path, 'rb') as f_in:
        with open(temp_restored, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    # Verify database integrity before committing
    print(f"4. Running PRAGMA integrity_check on restored database...")
    conn = sqlite3.connect(temp_restored)
    cur = conn.cursor()
    cur.execute("PRAGMA integrity_check;")
    status = cur.fetchone()[0]
    conn.close()

    if status.lower() != "ok":
        print(f"[CRITICAL ERROR] Restored database corrupted: {status}")
        if os.path.exists(temp_restored):
            os.remove(temp_restored)
        sys.exit(1)
    print("   [PASS] Database integrity verified: Status = OK.")

    # Commit restore
    print(f"5. Committing restored database to {DB_PATH}...")
    # Clean WAL and SHM files to prevent state conflict
    for ext in ["", "-wal", "-shm"]:
        target = DB_PATH + ext if ext else DB_PATH
        if os.path.exists(target):
            try:
                os.remove(target)
            except Exception:
                pass

    shutil.move(temp_restored, DB_PATH)
    print("\n>>> RESTORE COMPLETED SUCCESSFULLY: DATABASE IS FULLY OPERATIONAL! <<<")

if __name__ == '__main__':
    restore_latest_backup()
