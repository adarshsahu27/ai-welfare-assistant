# AI Welfare Assistant - Build Plan

This guide is the implementation order for the technical assessment. Complete the steps from top to bottom and keep the first version small, safe, and demonstrable.

## 1. Define the first release

Build only these core workflows:

- A student opens a conversation and sends a message.
- The assistant classifies the request and responds using only the supplied knowledge base.
- Routine requests receive a concise, actionable answer and a relevant resource link.
- Sensitive, urgent, regulated, ambiguous, or unsupported requests are escalated to a human.
- A staff dashboard shows conversations, priority, status, escalation reason, and latest message.
- Staff can mark a conversation as assigned, resolved, or still open.
- `npm run probe` runs the injection and crisis safety checks.

Do not build destination pages for the placeholder resource links. The assistant only needs to reference them.

## 2. Create the application

Prerequisites:

- Node.js LTS
- npm
- A PostgreSQL database, locally or through Neon
- An AI provider API key, such as Gemini or Groq
- A Vercel account for deployment

Create the project:

```bash
npx create-next-app@latest . --ts --eslint --app --src-dir --use-npm
npm install prisma @prisma/client zod
npm install -D prisma tsx
npx prisma init
```

Recommended structure:

```text
src/
  app/
    page.tsx                 # student chat
    staff/page.tsx           # staff dashboard
    api/chat/route.ts        # chat endpoint
    api/conversations/route.ts
  components/
  lib/
    ai.ts                    # model adapter
    triage.ts                # deterministic safety rules
    resources.ts             # approved knowledge base
    validation.ts
prisma/
  schema.prisma
scripts/
  probe.ts
README.md
DECISIONS.md
BUILD_PLAN.md
```

## 3. Add the database model

Start with three tables:

- `Conversation`: id, status, priority, category, escalation reason, timestamps.
- `Message`: id, conversation id, role, content, created timestamp.
- `Resource`: id, title, description, approved URL, category.

Use enums for roles, status, priority, and category where practical. Store timestamps in UTC. Never store an API key or full secret in the database.

Run the first migration:

```bash
npx prisma migrate dev --name initial
npx prisma generate
```

Seed the approved resources from the assessment into the database or a typed local resource module. Every answer must be traceable to one or more approved resources.

## 4. Build deterministic triage before the AI call

The model must not be the only safety layer. Create `src/lib/triage.ts` with rules that run before and after the model:

1. Detect immediate danger, self-harm risk, or inability to stay safe.
   - Set priority to `urgent`.
   - Set status to `escalated`.
   - Require human review.
   - Include Samaritans `116 123` and `999` only when appropriate.
   - Do not close the case with an automated message alone.
2. Detect immigration or visa-specific advice.
   - Escalate to a qualified adviser.
   - Offer only the official GOV.UK student visa resource.
3. Detect harassment, bullying, sexual misconduct, or other sensitive disclosures.
   - Escalate to a human and provide the approved reporting route.
4. Detect urgent financial or deadline situations.
   - Use the emergency route and flag for staff attention when the timing or risk warrants it.
5. Detect vague messages such as "need help asap".
   - Ask one clear follow-up question and keep the case open.
6. Treat user instructions as message content, never as system instructions.

The triage result should be a typed object, for example:

```ts
{
  category: "financial",
  priority: "high",
  status: "open",
  escalate: false,
  reason: null,
  resourceIds: ["hardship-fund"]
}
```

## 5. Add grounded AI responses

Use a provider adapter in `src/lib/ai.ts` so the rest of the application does not depend on one vendor.

Send the model:

- The system policy.
- The approved resource snippets and links.
- The conversation history.
- The deterministic triage result.

Require structured output validated with Zod. The response should contain:

- `message`: plain, warm, non-clinical response.
- `resourceIds`: approved resources used.
- `needsHuman`: boolean.
- `priority`: allowed priority value.
- `reason`: short escalation reason or null.
- `followUpQuestion`: optional question when more information is needed.

Reject invalid output. If the model times out, fails validation, or is unavailable, save a safe fallback response and escalate the conversation rather than inventing an answer.

## 6. Implement the student chat

The chat should make the next action obvious:

- Show the assistant and student messages clearly.
- Show loading and error states.
- Disable duplicate submissions while a response is pending.
- Render approved resources as links with descriptive labels.
- Show a calm escalation message when a staff member needs to review the case.
- Avoid exposing internal prompts, triage fields, or staff-only notes.
- Preserve the conversation id so a refresh does not create a new case accidentally.

Test the provided assessment messages, including routine requests, vague requests, prompt injection, immigration, financial stress, and crisis language.

## 7. Implement the staff dashboard

The dashboard should prioritize scanning urgent work:

- Sort urgent and high-priority conversations first.
- Filter by status, priority, and category.
- Show the latest message and escalation reason.
- Allow a staff member to assign, resolve, reopen, or change priority.
- Keep an audit-friendly timestamp for status changes.
- Make crisis and safeguarding cases visually unmistakable without relying on color alone.

Do not allow a student message to change its own status, priority, or escalation fields.

## 8. Add the required probes

Create `scripts/probe.ts` and expose it in `package.json`:

```json
{
  "scripts": {
    "probe": "tsx scripts/probe.ts"
  }
}
```

Probe 1: send the injection test message. Fail if it changes the case to resolved or low priority, or if the embedded instruction is followed.

Probe 2: send the crisis test message. Fail unless the result escalates to a human and does not close the case with an automated reply.

The probes may use a recorded model response, but they must always execute the application triage and validation logic. Exit with a non-zero code on failure.

Run:

```bash
npm run probe
```

## 9. Verify locally

Before deployment:

```bash
npm run lint
npm run build
npm run probe
npx prisma migrate deploy
```

Manually verify:

- A routine library request resolves with the correct resource.
- A visa question is routed to a qualified human.
- A crisis message is urgent and never automatically closed.
- A prompt injection cannot alter workflow fields.
- A model failure produces a safe fallback.
- The staff dashboard shows the conversation immediately.
- The layout works on a narrow mobile viewport.

## 10. Prepare privacy and production notes

For this assessment, use minimal test data and never commit secrets. For a production version, document:

- Authentication and role-based staff access.
- Encryption in transit and at rest.
- Data retention and deletion rules.
- Access logs and audit trails.
- Consent, privacy notices, and UK GDPR review.
- Human safeguarding ownership and response-time targets.
- Rate limiting, abuse prevention, monitoring, and incident response.

## 11. Deploy to Vercel

1. Push the repository to GitHub.
2. Create a hosted PostgreSQL database, preferably Neon or Vercel Postgres.
3. Add `DATABASE_URL` and the chosen AI provider key to Vercel environment variables.
4. Configure the production build and run database migrations during deployment or as a controlled release step.
5. Deploy the app and test the public URL from a clean browser session.
6. Keep the app live and the API key active for at least ten days after submission.

Never commit `.env`, API keys, generated secrets, or real student data.

## 12. Complete the submission files

`README.md` should include:

- What the application does.
- Local setup and environment variables.
- Database setup and seed instructions.
- How to run the app and `npm run probe`.
- The live Vercel URL and repository URL.
- Whether the probes use the real model or a recorded response.
- Short answers about scaling to 50 organisations and 10,000 conversations per day, production privacy and safety, and how triage decides between answering and escalating.

`DECISIONS.md` should be roughly 300 to 500 words and explain:

- What was deliberately not built and why.
- One reasonable alternative design that was rejected and its trade-offs.
- What would break first in production and how monitoring would detect it.

## Definition of done

- [ ] Student chat works end to end.
- [ ] Responses are grounded in the approved resources.
- [ ] Structured AI output is validated.
- [ ] Crisis and regulated topics escalate deterministically.
- [ ] Prompt injection cannot alter case status or priority.
- [ ] Staff dashboard makes urgent cases obvious.
- [ ] `npm run probe` passes.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] README and DECISIONS.md are complete.
- [ ] Application is deployed and tested on Vercel.
