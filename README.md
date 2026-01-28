# Kid Expenses

Shared child expense tracking for co-parents.

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Auth:** Clerk
- **API:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Hosting:** Vercel (frontend), Cloudflare (API)

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in your Clerk keys and API URL

# Run development server
npm run dev
```

## Project Structure

```
ke-console/
├── app/              # Next.js app router
├── components/       # React components
├── lib/              # Utilities and API client
├── workers/          # Cloudflare Workers (ke-api)
└── docs/             # Documentation
```

## Links

- [KE Sprint Board](https://github.com/orgs/kidexpenses/projects/1)
- [API Worker](https://ke-api.automation-ab6.workers.dev)
