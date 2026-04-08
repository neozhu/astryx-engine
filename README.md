This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Setup

Create a `.env.local` file from `.env.example` and set:

- `ASTROLOGY_PROVIDER` (`rapidapi` or `kerykeion-local`)
- `GEONAMES_USERNAME`
- `LOCAL_ASTROLOGY_API_URL` (required when `ASTROLOGY_PROVIDER=kerykeion-local`)
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local Kerykeion Service

To run the natal chart provider locally instead of RapidAPI:

1. Use Python `3.11.x`
2. Start the FastAPI service:

```bash
uv run --project services/kerykeion_api --python 3.11 uvicorn services.kerykeion_api.app:app --host 127.0.0.1 --port 8010
```

3. Set these env vars in `.env.local`:

```bash
ASTROLOGY_PROVIDER=kerykeion-local
LOCAL_ASTROLOGY_API_URL=http://127.0.0.1:8010
```

The local service currently replaces the natal chart step only. Optional natal context and transit/context calls remain disabled under the local provider.

Its natal response also includes point degrees (`position`, `abs_pos`), full house cusps (`chart_data.houses.cusps` / `chart_data.houses.list`), and natal aspects (`chart_data.aspects.all` / `chart_data.aspects.relevant`).

## Three-Pass AI Reading

When `ASTROLOGY_PROVIDER=kerykeion-local`, the app:

1. Calls the local natal chart API.
2. Builds a normalized `NormalizedChartPayload`.
3. Runs three `ChatGPT 5.4` passes with `json_schema` output:
   - explanation
   - structured analysis
   - structured forecast
4. Renders one primary layer first, then exposes forecast and chart-evidence layers as expandable supporting panels.

The server still keeps paragraph-based follow-up answers, but the initial ready payload now includes `primary`, `explanation`, `analysis`, and `forecast` sections for the same-page reading flow.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
