import os
import zipfile
import pathlib

ROOT_DIR = pathlib.Path(__file__).parent.resolve()
FRONTEND_DIR = ROOT_DIR / "frontend"
OUTPUT_ZIP = ROOT_DIR / "firasa-nodejs-hostinger.zip"

# Items to include from frontend/
TOP_LEVEL_FILES = [
    "package.json",
    "package-lock.json",
    "next.config.mjs",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.mjs",
    ".env.example",
    "next-env.d.ts",
]

TOP_LEVEL_DIRS = [
    "public",
    "src",
]

EXCLUDE_NAMES = {
    "node_modules",
    ".next",
    "out",
    ".git",
    ".env.local",
    ".firasa-cache.json",
}


def create_posix_zip():
    print(f"Creating POSIX-compliant ZIP: {OUTPUT_ZIP}")
    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()

    # Collect all directories and files
    directories_to_add = set()
    files_to_add = []  # list of (abs_path, posix_rel_path)

    for fname in TOP_LEVEL_FILES:
        fpath = FRONTEND_DIR / fname
        if fpath.is_file():
            files_to_add.append((fpath, fname))

    for dname in TOP_LEVEL_DIRS:
        dir_path = FRONTEND_DIR / dname
        if not dir_path.is_dir():
            continue

        for root, dirs, files in os.walk(dir_path):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_NAMES]

            root_path = pathlib.Path(root)
            rel_dir = root_path.relative_to(FRONTEND_DIR).as_posix()
            directories_to_add.add(rel_dir.rstrip("/") + "/")

            # Also ensure all intermediate parent directories are added
            parts = rel_dir.split("/")
            for i in range(1, len(parts)):
                directories_to_add.add("/".join(parts[:i]) + "/")

            for file in files:
                if file in EXCLUDE_NAMES or file.endswith(".local") or file.endswith(".tmp"):
                    continue
                file_path = root_path / file
                rel_file = file_path.relative_to(FRONTEND_DIR).as_posix()
                files_to_add.append((file_path, rel_file))

    # Sort directories by depth so parents come before children
    sorted_dirs = sorted(directories_to_add, key=lambda d: (d.count("/"), d))

    with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 1. Write all directory entries with Unix 0o755 permissions
        for dir_name in sorted_dirs:
            zinfo = zipfile.ZipInfo(dir_name)
            zinfo.create_system = 3  # Unix
            # 0o40755 = directory (0o40000) + rwxr-xr-x (0o755)
            # 0x10 = MS-DOS directory attribute
            zinfo.external_attr = (0o40755 << 16) | 0x10
            zf.writestr(zinfo, "")

        # 2. Write all file entries with Unix 0o644 permissions
        for abs_path, rel_posix in files_to_add:
            with open(abs_path, "rb") as f:
                content = f.read()

            zinfo = zipfile.ZipInfo(rel_posix)
            zinfo.create_system = 3  # Unix
            # 0o100644 = regular file (0o100000) + rw-r--r-- (0o644)
            zinfo.external_attr = 0o100644 << 16
            zf.writestr(zinfo, content)

    print(f"Successfully created {OUTPUT_ZIP.name} ({OUTPUT_ZIP.stat().st_size:,} bytes)")

    # 3. Verify permissions in the resulting zip
    verify_zip(OUTPUT_ZIP)


def verify_zip(zip_path: pathlib.Path):
    print("\n--- Verifying Zip Permissions & Structure ---")
    with zipfile.ZipFile(zip_path, "r") as zf:
        infolist = zf.infolist()
        print(f"Total entries in archive: {len(infolist)}")

        sample_paths = [
            "package.json",
            "src/",
            "src/app/",
            "src/app/api/",
            "src/app/api/v1/",
            "src/app/api/v1/health/route.ts",
            "src/lib/server-engine.ts",
        ]

        verified_samples = 0
        for sample in sample_paths:
            found = False
            for info in infolist:
                if info.filename == sample:
                    found = True
                    verified_samples += 1
                    mode = info.external_attr >> 16
                    mode_oct = oct(mode)
                    is_unix = info.create_system == 3
                    print(f"  [OK] {info.filename:<35} | Unix: {is_unix} | Mode: {mode_oct}")
                    # Assert expected mode
                    if info.filename.endswith("/"):
                        assert mode == 0o40755, f"Expected 0o40755 for directory {info.filename}, got {mode_oct}"
                    else:
                        assert mode == 0o100644, f"Expected 0o100644 for file {info.filename}, got {mode_oct}"
                    break
            if not found:
                print(f"  [WARN] Sample entry not found in archive: {sample}")

        assert verified_samples >= 5, f"Expected at least 5 sample verifications, got {verified_samples}"
        print("\nAll directory (0o755) and file (0o644) POSIX permissions verified successfully!")


if __name__ == "__main__":
    create_posix_zip()
