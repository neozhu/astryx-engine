# Astryx Engine

Astryx Engine is a Next.js 16 app that generates Chinese astrology readings from birth details and postal code input. It uses a local Kerykeion-based chart service plus OpenAI Responses API calls to produce:

- a primary reading summary
- an explanation layer
- a structured analysis layer
- a structured forecast layer
- up to 3 follow-up answers per session

## Stack

- Next.js 16 + React 19
- OpenAI Node SDK
- Zod
- Vitest + Testing Library
- Optional local FastAPI service in `services/kerykeion_api`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the sample env file:

```bash
cp .env.local.sample .env.local
```

3. Fill in the required values in `.env.local`.

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` from `.env.local.sample`.

### Required for all setups

- `GEONAMES_USERNAME`
  Used to resolve postal-code based birth locations.
- `OPENAI_API_KEY`
  Used for the initial three-pass reading and follow-up answers.
- `LOCAL_ASTROLOGY_API_URL`
  Base URL for the local astrology API.

### Optional

- `OPENAI_READING_MODEL`
  Overrides the default model. Defaults to `gpt-5.4`.

## Local Astrology API

The app only supports the local FastAPI service in `services/kerykeion_api`.

1. Use Python `3.11.x`.
2. Start the local service:

```bash
uv run --project services/kerykeion_api --python 3.11 uvicorn services.kerykeion_api.app:app --host 127.0.0.1 --port 8010
```

3. Set `.env.local`:

```bash
LOCAL_ASTROLOGY_API_URL=http://127.0.0.1:8010
GEONAMES_USERNAME=your_geonames_username
OPENAI_API_KEY=your_openai_api_key
```

The app sends natal chart requests to the local API and treats local transit/context endpoints as optional. If the local service does not provide those optional endpoints, the reading flow falls back to the locally available natal chart data.

## Reading Flow

`POST /api/reading`

- validates birth date, time, and postal code input
- resolves location from GeoNames
- builds the astrology bundle from the local provider
- normalizes chart payload data
- runs 3 OpenAI structured passes for explanation, analysis, and forecast
- returns the ready reading payload or an unavailable/location-match result

`POST /api/reading/follow-up`

- verifies the encoded session token
- rebuilds the reading context server-side
- answers a follow-up question in Chinese
- rotates the token and enforces a 3-question limit

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Testing

Run the test suite with:

```bash
npm run test
```

The repo includes frontend, flow, and reading-library tests under `test/`.
