import json
import re
from functools import lru_cache
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.gzip import GZipMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="Amit Khatri Travel Planner",
    description="Explore Indian railway stations, compare sample journey options, and save an in-app itinerary copy.",
    version="1.0.0",
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.middleware("http")
async def cache_versioned_assets(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") and response.status_code == 200:
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
STATION_DATA_PATH = BASE_DIR / "data" / "railway" / "stations.geojson"
SITE_NAME = "Amit Khatri Travel Planner"
STATIC_VERSION = "web-love-20"
SITE_DESCRIPTION = (
    "Explore Indian railway stations, compare sample journey options, and save an "
    "in-app itinerary copy. Made with love by Amit Khatri."
)


def page_context(request: Request, route_name: str):
    home_url = str(request.url_for("read_home"))
    return {
        "request": request,
        "canonical_url": str(request.url_for(route_name)),
        "share_image_url": f"{request.url_for('static', path='images/indian-railways-hero.jpg')}?v={STATIC_VERSION}",
        "structured_data": {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebSite",
                    "name": SITE_NAME,
                    "url": home_url,
                    "description": SITE_DESCRIPTION,
                    "inLanguage": "en-IN",
                    "author": {"@type": "Person", "name": "Amit Khatri"},
                },
                {
                    "@type": "WebApplication",
                    "name": SITE_NAME,
                    "url": home_url,
                    "applicationCategory": "TravelApplication",
                    "operatingSystem": "Any",
                    "description": SITE_DESCRIPTION,
                },
            ],
        },
    }


@lru_cache(maxsize=1)
def load_station_directory():
    """Load and normalize the bundled CC0 station snapshot once per process."""
    with STATION_DATA_PATH.open(encoding="utf-8") as source:
        geojson = json.load(source)

    stations = []
    for feature in geojson.get("features", []):
        properties = feature.get("properties") or {}
        name = str(properties.get("name") or properties.get("code") or "").strip()
        if not name:
            continue
        coordinates = (feature.get("geometry") or {}).get("coordinates") or []
        longitude = coordinates[0] if len(coordinates) > 0 else None
        latitude = coordinates[1] if len(coordinates) > 1 else None
        stations.append({
            "name": name,
            "code": str(properties.get("code") or "").strip().upper(),
            "state": str(properties.get("state") or "").strip(),
            "zone": str(properties.get("zone") or "").strip().upper(),
            "address": str(properties.get("address") or "").strip(),
            "latitude": latitude,
            "longitude": longitude,
        })
    return stations


def station_search_rank(station, query):
    query = query.strip().casefold()
    if not query:
        return (0, station["name"].casefold())
    code = station["code"].casefold()
    name = station["name"].casefold()
    fields = (station["state"], station["zone"], station["address"])
    if code == query:
        rank = 0
    elif name == query:
        rank = 1
    elif code.startswith(query) or name.startswith(query):
        rank = 2
    elif any(query in value.casefold() for value in fields):
        rank = 3
    elif query in name or query in code:
        rank = 4
    else:
        rank = 5
    return (rank, name)


@app.get("/api/station-directory")
async def station_directory_info():
    return {
        "source": "DataMeet Indian Railways dataset",
        "source_url": "https://github.com/datameet/railways",
        "license": "CC0 1.0 Universal",
        "records": len(load_station_directory()),
        "fields": ["name", "code", "state", "zone", "address", "latitude", "longitude"],
        "search_url": "/api/stations?q={query}",
        "download_url": "/api/stations/export",
        "note": "Community snapshot; station details can change. Verify current travel information with Indian Railways.",
    }


@app.get("/api/stations")
async def search_stations(q: str = "", limit: int = Query(default=12, ge=1, le=50)):
    query = re.sub(r"\s+", " ", q).strip()
    stations = load_station_directory()
    if query:
        matches = [station for station in stations if station_search_rank(station, query)[0] < 5]
        matches.sort(key=lambda station: station_search_rank(station, query))
    else:
        matches = sorted(stations, key=lambda station: station["name"].casefold())
    return matches[:limit]


@app.get("/api/stations/export")
async def export_station_directory():
    return FileResponse(
        STATION_DATA_PATH,
        media_type="application/geo+json",
        filename="indian-railway-stations.geojson",
    )


@app.get("/api/stations/{station_code}")
async def get_station(station_code: str):
    code = station_code.strip().casefold()
    for station in load_station_directory():
        if station["code"].casefold() == code:
            return station
    raise HTTPException(status_code=404, detail="Station code not found in this directory snapshot.")


@app.get("/", response_class=HTMLResponse)
async def read_home(request: Request):
    return templates.TemplateResponse("landing.html", page_context(request, "read_home"))


@app.get("/book", response_class=HTMLResponse)
async def read_booking_demo(request: Request):
    return templates.TemplateResponse("index.html", page_context(request, "read_booking_demo"))


@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt(request: Request):
    origin = str(request.url_for("read_home")).rstrip("/")
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        f"Sitemap: {origin}/sitemap.xml\n"
    )


@app.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    pages = [request.url_for("read_home"), request.url_for("read_booking_demo")]
    locations = "\n".join(f"  <url><loc>{xml_escape(str(url))}</loc></url>" for url in pages)
    return Response(
        content=(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{locations}\n"
            "</urlset>\n"
        ),
        media_type="application/xml",
    )
