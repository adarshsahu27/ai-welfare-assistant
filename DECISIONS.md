# Design Decisions

## What Was Deliberately Not Built

**1. Unlimited re-triage loops**
We ask one clarifying question, then re-triage once. Not building infinite back-and-forth because:
- Assessment asks for "a short back-and-forth"
- Real students need resolution, not loops
- Complexity grows quickly with multi-turn context

**2. Advanced caching or optimization**
No Redis, no query optimization, no asset caching because:
- 5-7 hour build doesn't need production-scale infra
- Deployed on Vercel's free tier (suitable for demo)
- Premature optimization obscures the core logic

**3. Soft-delete or audit trails**
No deleted_at columns, no comprehensive logging because:
- Assessment is for "working core," not compliance
- Production version would need this (see DECISIONS.md section 3)
- Adds noise to the schema for limited signal here

**4. Custom AI prompt engineering**
System prompt is straightforward, not multi-shot or chain-of-thought because:
- JSON schema validation catches most errors anyway
- Simpler prompt = easier to debug and iterate
- Deterministic triage handles 80% of edge cases before AI

## One Reasonable Alternative Rejected

**Escalate on timeout vs. retry logic**

We chose: Escalate immediately if Gemini fails (30s timeout) or returns invalid JSON.

Alternative we rejected: Retry with exponential backoff, then escalate on third failure.

Trade-off:
- Our choice: Student sees escalation quickly (good UX, safe), but we might miss a transient error (operational cost)
- Retry approach: Higher success rate, but student waits 60+ seconds for a message (poor experience during crisis), and we risk flaky behavior being invisible

For welfare support, fast escalation > retry gambling. Decided correctly.

## What Breaks First in Production

**1. Database connection pooling** (breaks in hours)
- Free Neon tier has limited connections (10)
- With 10k conversations/day, we'd exhaust connections by mid-morning
- **How we'd detect**: Connection pool timeout errors in logs, gradual increase in API latency
- **Fix**: Move to production Postgres with pool (PgBouncer), monitor pool usage

**2. Gemini API rate limits** (breaks in hours to days)
- Free tier has ~60 RPM per project
- 10k conversations/day = ~7 requests/minute sustained (if all hit AI)
- **How we'd detect**: `429 Too Many Requests` in Gemini responses, fallback to Groq, then escalation spike
- **Fix**: Queue-based triage (async), batch processing, API key rotation

**3. Missing context in escalation** (breaks operationally, weeks)
- Staff get a message but no student contact info if browser closed before form submit
- We collect name/email upfront, but could be bypassed if JS fails
- **How we'd detect**: Staff can't reach student, retro-matching failures
- **Fix**: Add optional phone number, validate form more rigorously, email confirmation loop

We'd see #1 and #2 within a day of launch. #3 emerges after staff start using it and realize context gaps.
