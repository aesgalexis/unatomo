# Product Notes

These notes record product-direction conversations with the owner. They are not rules or commitments; treat them as lightweight context for future decisions.

## 2026-06-16 - Operational Direction

Unatomo is already being used physically in industrial laundries and dry cleaners in Greece and Spain, with QR codes printed and placed on real machines. The strongest current product direction is a machine-centered operational layer: each physical machine gets a digital record with QR access, history, tasks, documents, state, and ownership/admin context.

Near-future ideas to keep in mind:

- Separate **incidents** from tasks. A task is planned or preventive work; an incident is something failing now. Incidents should likely support severity, open/closed state, photos, and responsible person/account.
- Add **quick mobile photos** from QR flows: leak, plate, wiring, error screen, broken part, etc. These should land in the relevant machine context, either as documentation, incident evidence, or history.
- Avoid building a generic WhatsApp-like chat. If communication is added, prefer comments/notes attached to a machine, task, incident, or history event.
- Let the global registry evolve toward an operational activity inbox. Read/unread state per user may be more valuable than a standalone chat: new events can appear visually highlighted until a user views them or marks them as reviewed.
- For normal events, automatic "seen" may be enough. For critical events, such as out-of-service machines or severe incidents, a stronger explicit state like "reviewed" / "acknowledged" may be better.

Working product principle: Unatomo should be where the durable operational truth of each machine lives. Fast chat tools can still exist outside the product, but important machine context should not disappear into external conversations.
