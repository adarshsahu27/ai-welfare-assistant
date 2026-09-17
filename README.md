# AI Welfare Assistant

A conversational AI system that provides immediate support to students, handling routine enquiries autonomously while safely escalating complex, urgent, or sensitive cases to human staff.

## Features

- **Conversational interface**: Natural chat-style interaction for students
- **Deterministic safety layer**: Rules-based triage before AI calls (crisis detection, regulated topics, vague requests)
- **Dual-provider AI**: Gemini primary, Groq fallback, with graceful degradation
- **Three behaviors**: Handle routine requests, ask clarifying questions, escalate to human
- **Staff dashboard**: View cases by priority/urgency, claim cases safely, track status
- **Safety probes**: Automated tests for injection attacks and crisis detection

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon or local)
- Gemini API key: https://aistudio.google.com/app/apikeys
- Groq API key: https://console.groq.com/keys

### Environment Variables

Create `.env`:

DATABASE_URL="postgresql://..."
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"


### Install & Run

```bash
npm install
npx prisma db push
npm run dev
```

Visit: http://localhost:3000 (student chat) or http://localhost:3000/staff (dashboard)

## Testing

Run safety probes:
```bash
npm run probe
```

Both probes pass:
- **Probe 1**: Injection attack is escalated, not resolved
- **Probe 2**: Crisis message escalates with safeguarding flag

## Deployment

Deployed on Vercel at: [your-live-url]

Database: Neon Postgres (free tier)

## Architecture

Student Message
→ Deterministic Triage (rules-based safety)
→ If crisis/danger/vague: escalate or ask
→ Otherwise: Call AI (Gemini → Groq fallback)
→ Validate response against schema
→ Store in Postgres
→ Return to student + staff dashboard

## Notes

- Probes use live model calls (not mocked)
- Staff dashboard polls every 5 seconds
- Conversation history persists; refresh preserves case ID
- All responses grounded in approved knowledge base only

## Scaling to 50 Orgs / 10k Conversations/Day

Would need:
- Tenant isolation (separate DB schemas per org)
- Read replicas for dashboard queries
- Caching layer (Redis) for knowledge base + triage results
- Message queue (Kafka) for async triage
- Rate limiting per org
- Multi-region deployment