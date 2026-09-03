import os
import sys
import time
import gzip
import shutil
import sqlite3
import hashlib

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'enterprise.db')
BACKUPS_DIR = os.path.join(BASE_DIR, 'backups')
MAX_BACKUPS_RETAINED = 14

os.makedirs(BACKUPS_DIR, exist_ok=True)

def create_online_backup():
    print("=" * 68)
    print("  GOLDEN GLOBAL EXPO — ATOMIC DISASTER RECOVERY BACKUP ENGINE")
    print("=" * 68)

    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database file not found at: {DB_PATH}")
        sys.exit(1)

    timestamp = time.strftime('%Y%m%d_%H%M%S')
    temp_backup_file = os.path.join(BACKUPS_DIR, f"enterprise_temp_{timestamp}.db")
    final_gz_file = os.path.join(BACKUPS_DIR, f"enterprise_backup_{timestamp}.db.gz")

    print(f"1. Initiating live online SQLite backup lock-safe stream...")
    # SQLite Online Backup API creates a live atomic copy without stopping server writes
    src_conn = sqlite3.connect(DB_PATH)
    dst_conn = sqlite3.connect(temp_backup_file)
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
    dst_conn.close()
    src_conn.close()
    print(f"   Live copy captured: {os.path.getsize(temp_backup_file):,d} bytes")

    # Verify integrity of the backup
    print(f"2. Running PRAGMA integrity_check on backup snapshot...")
    chk_conn = sqlite3.connect(temp_backup_file)
    cur = chk_conn.cursor()
    cur.execute("PRAGMA integrity_check;")
    status = cur.fetchone()[0]
    chk_conn.close()

    if status.lower() != "ok":
        print(f"[CRITICAL FAILURE] Backup snapshot failed integrity check: {status}")
        if os.path.exists(temp_backup_file):
            os.remove(temp_backup_file)
        sys.exit(1)
    print(f"   [PASS] Integrity verified: Status = OK (Zero database corruption)")

    # Gzip compress
    print(f"3. Compressing backup with gzip algorithm...")
    with open(temp_backup_file, 'rb') as f_in:
        with gzip.open(final_gz_file, 'wb', compresslevel=9) as f_out:
            shutil.copyfileobj(f_in, f_out)
    os.remove(temp_backup_file)

    # Compute SHA-256 checksum
    hasher = hashlib.sha256()
    with open(final_gz_file, 'rb') as f:
        hasher.update(f.read())
    sha256 = hasher.hexdigest()

    checksum_file = final_gz_file + ".sha256"
    with open(checksum_file, 'w', encoding='utf-8') as f:
        f.write(f"{sha256}  {os.path.basename(final_gz_file)}\n")

    print(f"   [SUCCESS] Compressed backup ready: {os.path.getsize(final_gz_file):,d} bytes")
    print(f"   SHA-256 Checksum: {sha256}")
    print(f"   Saved to: {final_gz_file}")

    # Retention Pruning
    print(f"4. Enforcing backup retention policy (Retaining last {MAX_BACKUPS_RETAINED} snapshots)...")
    existing_backups = sorted([
        f for f in os.listdir(BACKUPS_DIR) if f.startswith('enterprise_backup_') and f.endswith('.db.gz')
    ])
    if len(existing_backups) > MAX_BACKUPS_RETAINED:
        to_delete = existing_backups[:-MAX_BACKUPS_RETAINED]
        for old in to_delete:
            old_path = os.path.join(BACKUPS_DIR, old)
            old_chk = old_path + ".sha256"
            try:
                os.remove(old_path)
                if os.path.exists(old_chk):
                    os.remove(old_chk)
                print(f"   Pruned expired backup: {old}")
            except Exception as e:
                print(f"   Warning pruning {old}: {e}")

    print("\n>>> DISASTER RECOVERY SNAPSHOT COMPLETE & VERIFIED 100% HEALTHY <<<")

if __name__ == '__main__':
    create_online_backup()
