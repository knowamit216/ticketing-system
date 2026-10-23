# Amit Khatri Travel Planner

A FastAPI travel planner for exploring Indian railway stations and route ideas. It provides station search, route maps, recent searches, and copyable/downloadable itinerary notes. It does not have a live railway data feed and does not book seats or process payments; current train schedules, availability, fares, PNR status, and running status are handed off to official railway services.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000> in your browser. The landing page links to the journey planner at `/book`.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fknowamit216%2Fticketing-system&project-name=amit-khatri-travel-planner)

Vercel detects the FastAPI application in `app/main.py` and serves its mounted static files. Connect your Vercel account and approve the project import to publish it.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/knowamit216/ticketing-system)

Use the button to connect your Render account and approve the web service. The site uses the included `render.yaml` blueprint. The Render free service may take a short time to wake after inactivity.

## Netlify compatibility

Netlify can host static sites, but it does not run this FastAPI application or Python serverless functions. Deploying this repository directly to Netlify would not run its page routes or station APIs. Hosting it there requires a separate static frontend build and a supported backend (such as the same app deployed on Vercel or Render).

## Data and deployment

The station directory is a bundled community-maintained CC0 snapshot in `data/railway/stations.geojson`. This app has no live railway feed; current schedules, fares, availability, PNR status, and running status are opened through official railway services.

`render.yaml` contains the Render web service configuration. The application exposes `/` as its health check. The blueprint uses manual deploys to avoid automatically deploying every copy created from the public button.
