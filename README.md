# Amit Khatri Travel Planner

A FastAPI travel planner for exploring Indian railway stations and sample train journeys. The planner provides station search, route previews, sample train results, PNR and chart enquiry demos, and downloadable itinerary copies. It does not book railway seats or process payments.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000> in your browser. The landing page links to the journey planner at `/book`.

## Data and deployment

The station directory is a bundled community-maintained CC0 snapshot in `data/railway/stations.geojson`. Train schedules, fares, availability, PNR status, and chart results are sample previews.

`render.yaml` contains the Render web service configuration. The application exposes `/` as its health check.
