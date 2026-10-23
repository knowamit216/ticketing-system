"""Configure Netlify's reverse proxy to the deployed Vercel app."""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "netlify.toml"
PLACEHOLDER = "VERCEL_ORIGIN_PLACEHOLDER"


def main() -> None:
    origin = os.environ.get("VERCEL_ORIGIN", "").strip().rstrip("/")
    if not origin:
        raise SystemExit(
            "Set the Netlify environment variable VERCEL_ORIGIN to the public "
            "HTTPS origin of the deployed Vercel app, then redeploy."
        )
    if not re.fullmatch(r"https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?", origin):
        raise SystemExit(
            "VERCEL_ORIGIN must be an HTTPS origin only, such as "
            "https://your-project.vercel.app (no path or trailing query)."
        )

    config = CONFIG.read_text(encoding="utf-8")
    if PLACEHOLDER not in config:
        raise SystemExit("Netlify proxy placeholder is missing from netlify.toml.")
    CONFIG.write_text(config.replace(PLACEHOLDER, origin), encoding="utf-8")
    print(f"Configured Netlify proxy for {origin}")


if __name__ == "__main__":
    main()
