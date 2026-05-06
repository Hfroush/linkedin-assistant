# LinkedIn Assistant

A personal AI-powered LinkedIn writing assistant. It turns rough ideas into draft posts in Houtan's voice, surfaces relevant articles, stores draft history, tracks manual post metrics, and uses performance data to improve future suggestions.

## Current status

This is a single-user personal tool. It is suitable for local use or a protected private deployment. Do not deploy it publicly without access protection.

## Stack

- Next.js 15 App Router
- React 19
- Tailwind CSS v4
- Anthropic SDK
- Neon Postgres
- Drizzle ORM
- rss-parser
- mammoth for DOCX parsing

## Environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then set:

```env
ANTHROPIC_API_KEY=...
DATABASE_URL=...
APP_BASIC_AUTH_USERNAME=...
APP_BASIC_AUTH_PASSWORD=...
```

`APP_BASIC_AUTH_USERNAME` and `APP_BASIC_AUTH_PASSWORD` are required in production.

## Database setup

Generate and apply schema changes:

```bash
npm run db:generate
npm run db:migrate
```

For fast local prototyping, you can use:

```bash
npm run db:push
```

## Seed data

Seed topic areas:

```bash
npm run seed-topics
```

Seed the voice profile only after adding the private source document expected by `scripts/seed.ts`:

```bash
npm run seed
```

Do not commit the private DOCX file.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run test
npm run typecheck
npm run build
```

Or:

```bash
npm run check
```

## Deployment

Before deploying to Vercel or another public host:

1. Set `ANTHROPIC_API_KEY`.
2. Set `DATABASE_URL`.
3. Set `APP_BASIC_AUTH_USERNAME`.
4. Set a long random `APP_BASIC_AUTH_PASSWORD`.
5. Run database migrations.
6. Seed topic areas.
7. Seed the voice profile from the private DOCX source.
8. Confirm the deployed app asks for credentials.

## Security notes

This app can generate AI content, mutate the database, and store private draft history. Keep it behind an access gate.

Do not expose it as a public app until proper user accounts, rate limits, audit logging, and ownership checks exist.
