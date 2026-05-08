# ChaufX Web

Public website and operations web app for ChaufX Canada.

This repository contains:

- the marketing website
- driver onboarding flow
- unified login
- admin dashboard pages
- local shared packages used by the web app

## Tech stack

- Next.js 15
- TypeScript
- Tailwind CSS 4

## Repository structure

```text
app
components
lib
public
packages
```

## Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Set:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain/api
```

For local development you can use:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Local development

```bash
npm install
npm run dev
```

The app runs at:

- [http://localhost:3000](http://localhost:3000)

## Production build

```bash
npm install
npm run build
```

## Netlify deployment

Recommended settings:

- Base directory: leave blank
- Package directory: leave blank
- Build command: leave blank if Netlify reads `netlify.toml`, otherwise use `npm run build`
- Publish directory: leave blank

This repository is now a flat root-level Next.js app, which is the simplest shape for Netlify’s Next.js runtime.

## Notes

- This repo is intentionally web-only.
- Mobile apps live in `ChaufX-Mobile`.
- The API lives in `ChaufX-backend`.
