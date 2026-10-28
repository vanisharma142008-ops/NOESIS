# NOÊSIS

**Interactive, adaptive Physics and Mathematics for CBSE/NCERT Classes 11–12.**

NOÊSIS helps students learn through interactive lessons, visual explanations, adaptive practice, and personalized study sessions across a curated selection of 24 chapters.

## Current Status

As of October 28, 2026:

- **Roadmap and learning system:** Built, including adaptive practice, answer checking, progress tracking, and session resume.
- **Phase 3:** Laws of Motion pilot with adaptive sessions and mastery tracking.
- **Phase 5:** Animated owl tutor, interactive visual explanations, and voice support.
- **Content review:** Questions and lessons are still awaiting human approval. Mastery is disabled for unapproved content.
- **AI tutoring:** Disabled by default. The tutor currently uses built-in hints and visual explanations.

See the [Phase 3 Report](https://github.com/vanisharma142008-ops/NOESIS/blob/main/docs/phase-3-report.md), [Phase 5 Report](https://github.com/vanisharma142008-ops/NOESIS/blob/main/docs/phase-5-report.md), and [Project Blueprint](https://github.com/vanisharma142008-ops/NOESIS/blob/main/docs/BLUEPRINT.md).

## Getting Started

**Requirements:** Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To create a production build:

```bash
npm run build
npm start
```

## Features

- Interactive Physics and Mathematics learning.
- Adaptive questions based on student progress.
- Visual simulations and step-by-step explanations.
- Animated owl tutor with hints and feedback.
- Progress saved locally in the browser using IndexedDB.
- Export, import, and erase progress.
- Optional AI chat and voice support.

## AI Tutor Setup

AI features are disabled by default. To test AI tutoring locally:

1. Copy `.env.example` to `.env.local`.
2. Add your `OPENAI_API_KEY` or `GEMINI_API_KEY`.
3. Run `npm run dev`.

**Important:** Adding an API key alone does not enable AI. Provider configuration, adapter selection, and privacy review are also required. Never commit `.env.local` or expose your API keys.

See [AI and Voice](https://github.com/vanisharma142008-ops/NOESIS/blob/main/docs/09-ai-and-voice.md) and [Privacy](https://github.com/vanisharma142008-ops/NOESIS/blob/main/docs/10-privacy.md).

## Content and Testing

Question templates and lessons are stored in `content/`. All content requires human review before it can count toward mastery.

Validate content:

```bash
npm run content:validate
```

Run project checks:

```bash
npm run check
```

Build and run browser tests:

```bash
npm run build
npx playwright install chromium
npx playwright test
```

## Tech Stack

- Next.js
- React
- TypeScript
- IndexedDB
- Vitest and Playwright
- Optional OpenAI and Gemini APIs

## Project Structure

- `app/` and `src/` — Application and learning engine
- `content/` — Curriculum, lessons, and question templates
- `config/` — Learning and AI settings
- `tests/` — Unit and browser tests
- `docs/` — Architecture, reports, and project plans

**Note:** NOÊSIS is an actively developed project. Content approval and the live AI tutor are still pending.
