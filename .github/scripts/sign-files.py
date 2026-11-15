#!/usr/bin/env python3
"""
Sign files using a remote signing service.

The signing service accepts a zip archive of files to sign, POSTs it to
${SIGN_BASE_URL}/sign/ with X-API-KEY header, and returns a zip archive
of signed files with the same relative paths.

Usage:
  SIGN_BASE_URL=... SIGN_API_KEY=... python3 sign-files.py sign_files <dir> [only_ext]
  SIGN_BASE_URL=... SIGN_API_KEY=... python3 sign-files.py sign_one_file <file>
"""

import argparse
import io
import logging
import os
import sys
import zipfile

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)

SIGN_BASE_URL = os.getenv("SIGN_BASE_URL", "")
SIGN_API_KEY = os.getenv("SIGN_API_KEY", "")
TIMEOUT = float(os.getenv("SIGN_TIMEOUT") or "900")

SIGN_EXTENSIONS = [
    ".dll",
    ".exe",
    ".sys",
    ".vxd",
    ".msix",
    ".msixbundle",
    ".appx",
    ".appxbundle",
    ".msi",
    ".msp",
    ".msm",
    ".cab",
    ".ps1",
    ".psm1",
]


def sign_zip(zip_bytes):
    headers = {"X-API-KEY": SIGN_API_KEY}
    response = requests.post(
        f"{SIGN_BASE_URL}/sign/",
        headers=headers,
        data=zip_bytes,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.content


def sign_files_in_dir(dir_path, only_ext=None):
    if only_ext:
        only_ext = only_ext.split(",")
        for i in range(len(only_ext)):
            if not only_ext[i].startswith("."):
                only_ext[i] = "." + only_ext[i]

    files_to_sign = []
    for root, dirs, files in os.walk(dir_path):
        is_signed_dir = "RustDeskPrinterDriver" in root or "usbmmidd_v2" in root
        for file in files:
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file_path)
            if is_signed_dir and ext not in [".exe"]:
                continue
            if only_ext and ext not in only_ext:
                continue
            if ext in SIGN_EXTENSIONS:
                files_to_sign.append(file_path)

    if not files_to_sign:
        logging.info("No files to sign")
        return

    logging.info(f"Found {len(files_to_sign)} files to sign")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in files_to_sign:
            rel_path = os.path.relpath(file_path, dir_path)
            zf.write(file_path, rel_path)

    zip_bytes = zip_buffer.getvalue()
    logging.info(f"Sending {len(zip_bytes)} bytes to signing service")

    signed_zip_bytes = sign_zip(zip_bytes)

    logging.info(f"Received {len(signed_zip_bytes)} bytes from signing service")

    with zipfile.ZipFile(io.BytesIO(signed_zip_bytes), "r") as zf:
        zf.extractall(dir_path)

    logging.info(f"Signed {len(files_to_sign)} files successfully")


def sign_one_file(file_path):
    dir_path = os.path.dirname(file_path)
    file_name = os.path.basename(file_path)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(file_path, file_name)

    signed_zip_bytes = sign_zip(zip_buffer.getvalue())

    with zipfile.ZipFile(io.BytesIO(signed_zip_bytes), "r") as zf:
        zf.extract(file_name, dir_path)

    logging.info(f"Signed {file_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Sign files using a remote signing service."
    )
    subparsers = parser.add_subparsers(dest="command")

    sign_files_parser = subparsers.add_parser(
        "sign_files", help="Sign all signable files in a directory."
    )
    sign_files_parser.add_argument(
        "dir_path", help="The path of the directory containing the files to sign."
    )
    sign_files_parser.add_argument(
        "only_ext", help="The file extension to sign.", default=None, nargs="?"
    )

    sign_one_file_parser = subparsers.add_parser(
        "sign_one_file", help="Sign a single file."
    )
    sign_one_file_parser.add_argument("file_path", help="The path of the file to sign.")

    args = parser.parse_args()

    if not SIGN_BASE_URL:
        logging.error("SIGN_BASE_URL environment variable is required")
        sys.exit(1)
    if not SIGN_API_KEY:
        logging.error("SIGN_API_KEY environment variable is required")
        sys.exit(1)

    if args.command == "sign_files":
        sign_files_in_dir(args.dir_path, args.only_ext)
    elif args.command == "sign_one_file":
        sign_one_file(args.file_path)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
