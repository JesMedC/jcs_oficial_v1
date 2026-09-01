"""CLI entrypoint — `jcs-backend seed`."""
from __future__ import annotations

import argparse
import asyncio

from app.scripts.seed import seed


def main() -> None:
    parser = argparse.ArgumentParser(prog="jcs-backend")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed", help="Crea usuarios + workspace demo")

    args = parser.parse_args()
    if args.cmd == "seed":
        asyncio.run(seed())


if __name__ == "__main__":
    main()