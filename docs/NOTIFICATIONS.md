# Transactional Email And Notifications

## Purpose

This is the continuity document for Unatomo account email and future
notifications. Read it before changing templates, Resend delivery, Firebase
email actions, notification preferences, or the control-panel email view.

## Fixed decisions

- Resend is the transport for branded transactional email.
- Firebase remains the authority that creates and validates sensitive account
  action links (password reset, email verification and email change).
- Server code writes event-addressed messages to `email_outbox`; browsers never write
  to or read that collection.
- `deliverEmailOutbox` is the only Resend delivery path. The API key is the
  Firebase secret `RESEND_API_KEY`; never store it in source or browser code.
- Sender: `Unatomo <cuenta@correo.unatomo.com>`; replies go to
  `info@unatomo.com`.
- Every email has ES and EN HTML and plain-text output. The recipient account
  preference wins; legacy/missing preference falls back to Spanish.
- Event-specific idempotency keys prevent duplicate provider delivery.
- Welcome is sent once after onboarding, never on every login.
- Email verification should initially be encouraged, not used to block normal
  sign-in. It may later be required for sensitive operations.
- Important-activity email is reserved for security-relevant events; do not
  duplicate a more specific notification.

## Architecture

- `firebase/functions/src/email/templates.ts`: authoritative catalog and
  renderer for all languages and formats.
- `firebase/functions/src/email/outbox.ts`: constructors for outbox records.
- `firebase/functions/src/email/recipients.ts`: recipient language/name lookup
  and localized dashboard URLs.
- `firebase/functions/src/email/resend.ts`: Firestore trigger and Resend API.
- `firebase/functions/src/controlPanel/emailTemplates.ts`: superadmin preview
  catalog, rendered from the same production templates.
- `nfc/controlpanel/panelEmailTemplates.js`: list and ES/EN preview UI.

Outbox records contain `type`, `to`, `language`, sanitized template `data`,
`status`, `attemptCount`, `idempotencyKey` and timestamps. Delivery adds
`providerMessageId`, `sentAt` or `lastError`. Never put passwords, session
tokens, registration secrets unrelated to the email, or private machine data
in an outbox record.

## Template integration status

| Template | Status | Event |
| --- | --- | --- |
| `account_welcome` | Active | First successful onboarding completion |
| `admin_invite` | Active | Creation/re-creation of an administrator invitation |
| `machine_transfer_requested` | Active | Creation/re-creation of an ownership transfer request |
| `machine_transfer_completed` | Active | Accepted transfer; sent to previous and new owner |
| `password_reset` | Active | Neutral, rate-limited callable generates a Firebase Admin action link and queues Resend |
| `email_verification` | Active | Unverified email/password account finishing onboarding; non-blocking Firebase Admin action link |
| `registration_code_approved` | Blocked by product flow | Requires a request record with recipient, language and approve/reject action |
| `password_changed` | Blocked by product flow | Route password changes through an authenticated, recently reauthenticated app flow, then queue confirmation |
| `email_change_old` | Blocked by product flow | Requires secure email-change flow and notification to old address |
| `email_change_new` | Blocked by product flow | Requires Firebase verification-before-update link to new address |
| `account_activity` | Pending policy/events | Use for account deletion or security events without a dedicated template |

## Existing event behavior

- Administrator invite mail goes to the invited address and links to its
  localized dashboard. Recipient name/language are resolved from
  `account_directory` and `users` when available.
- Transfer-request mail goes to the target registered account.
- On accepted transfer, confirmation goes to both previous and new owner.
- New onboarding writes `language` to both the private user profile and account
  directory. Existing accounts without it receive Spanish until they update
  their preference or a migration is explicitly approved.

## Next implementation order

1. Extend the control panel with delivery totals/status, filtered recent
   outbox events and safe retry for failed messages. Never expose action URLs
   or sensitive template data in the browser.
2. Build `access_requests` with email, display name, language, timestamps and
   pending/approved/rejected status. Approval atomically creates a single-use
   registration code and queues `registration_code_approved`.
3. Build reauthenticated password/email-change flows and their security mail.

## Verification checklist

- Run `npm.cmd test` and `npm.cmd run build`.
- Test every changed template in ES and EN, including HTML escaping and plain
  text.
- Confirm outbox documents are server-only in Firestore rules.
- Confirm retries reuse the same Resend idempotency key.
- Exercise one real event in a non-destructive account and inspect both
  Firestore delivery status and Resend delivery.
- Deploy only the affected Functions, then publish the static site if browser
  code changed. Follow `docs/DEPLOY_NOTES.md`.

## Operational notes

- Domain `correo.unatomo.com` is verified in Resend.
- Resend branding is not added to message bodies; branding is controlled by
  the renderer.
- Do not use Zoho SMTP for application delivery while this architecture is
  active. Zoho remains the human mailbox for `info@unatomo.com`.
- A failed email must not roll back or corrupt the underlying account or
  machine operation. The durable outbox is the recovery boundary.
