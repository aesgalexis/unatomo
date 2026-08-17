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
- Operational notification preferences are separate from account/security email.
  They live in `user_notification_preferences/{uid}` and control
  the global email channel, lifecycle events, owner delivery, owner-authorized
  administrator routing and acceptance of administered-equipment alerts.
  Missing preferences keep operational email disabled, preserve the two event
  defaults and owner delivery, and leave both administrator-routing choices off.

## Architecture

- `firebase/functions/src/email/templates.ts`: authoritative catalog and
  renderer for all languages and formats.
- `firebase/functions/src/email/outbox.ts`: constructors for outbox records.
- `firebase/functions/src/email/recipients.ts`: recipient language/name lookup
  and localized dashboard URLs.
- `firebase/functions/src/email/resend.ts`: Firestore trigger and Resend API.
- `firebase/functions/src/machines/statusTransitions.ts`: canonical machine
  lifecycle transitions, restoration tasks and status history.
- `firebase/functions/src/notifications/machineStatus.ts`: operational email
  consumer for server-only `machine_domain_events`.
- `firebase/functions/src/controlPanel/emailTemplates.ts`: superadmin preview
  catalog, rendered from the same production templates.
- `nfc/controlpanel/panelEmailTemplates.js`: list and ES/EN preview UI.
- `firebase/functions/src/controlPanel/emailDelivery.ts`: superadmin-only,
  sanitized delivery totals/history and transactional failed-message retry.

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
| `registration_code_approved` | Active | Public access request reviewed in the superadmin panel; approval atomically creates a seven-day single-use code and queues email |
| `password_changed` | Active | Recently reauthenticated settings flow changes the password server-side and queues confirmation |
| `email_change_old` | Active | Sent to the previous address after Firebase confirms the verified change |
| `email_change_new` | Active | Firebase verify-before-update link sent to the requested new address |
| `account_activity` | Active | Initially connected to superadmin account deletion; reserved for sensitive administrative events |
| `machine_out_of_service` | Active | Operational opt-in: a machine moves from `operativa` to `fuera_de_servicio` |
| `machine_operational_again` | Active | Operational opt-in: a machine moves from `fuera_de_servicio` to `operativa` |

## Existing event behavior

- Access requests reject addresses already present in Firebase Authentication.
  Approved codes are bound to the requested email. The email button carries the
  code into registration, where it is validated automatically and the approved
  email is prefilled and locked. Legacy approved codes resolve the email through
  their access-request record, so they also reject an already registered account.

- Administrator invite mail goes to the invited address and links to its
  localized dashboard. Recipient name/language are resolved from
  `account_directory` and `users` when available.
- Transfer-request mail goes to the target registered account.
- On accepted transfer, confirmation goes to both previous and new owner.
- New onboarding writes `language` to both the private user profile and account
  directory. Existing accounts without it receive Spanish until they update
  their preference or a migration is explicitly approved.
- Settings save `user_notification_preferences/{uid}` with the extensible
  shape `email.enabled`, `email.events`, `email.receiveOwnedMachines`,
  `email.notifyAdministrators` and `email.receiveAdministeredMachines`.
  Turning off the channel retains the individual choices and prevents personal
  delivery, but does not revoke an owner's permission to notify administrators.
  An administrator receives an alert only when the machine link is accepted,
  the owner permits administrator alerts, and that administrator has enabled
  email, the matching event and administered-equipment delivery. The current
  events are deliberately explicit:
  `machineOutOfService` and `machineOperationalAgain`; there is no generic
  `statusChanged` notification and `desconectada` is not mailed.
- Machine configuration no longer stores or edits recipient addresses or
  notification events. A future machine override must layer on these global
  preferences without changing account/security email behavior.
- Dashboard and QR/NFC status changes use the same backend transition model.
  The transition atomically updates the machine and operational projection and
  writes one canonical event. Email delivery consumes that event; it does not
  infer lifecycle meaning independently from before/after status fields.

## Account security flow

- Settings reauthenticates with the account provider before password or email
  changes. Callables also reject authentication older than five minutes.
- Password changes happen in Admin Auth; plaintext passwords are never stored.
- Email changes remain pending in `account_email_changes` until Admin Auth shows
  the verified new address. Finalization migrates `account_directory` and sends
  the previous-address notice exactly once.
- `account_activity` is not used for ordinary profile or preference changes.

The control panel delivery console is active in source: it returns aggregate
status totals, up to 50 filtered events from the 100 most recent outbox records,
masked recipients and safe error metadata. It never returns template `data`,
action URLs, full recipient addresses or idempotency keys. A manual retry is
available only for `failed` records; it transactionally creates one new pending
record, retains the original provider idempotency key and marks the failed
record so the same failure cannot be retried twice.

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
