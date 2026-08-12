const assert = require("node:assert/strict");
const {
  EMAIL_TEMPLATE_DEFINITIONS,
  renderEmailTemplate,
  renderWelcomeEmail,
} = require("../lib/email/templates.js");

const spanish = renderWelcomeEmail({
  displayName: "Ana <script>",
  language: "es",
});
assert.equal(spanish.subject, "Te damos la bienvenida a UNATOMO/NFC");
assert.match(spanish.html, /https:\/\/unatomo\.com\/nfc/);
assert.match(spanish.html, /Ana &lt;script&gt;/);
assert.doesNotMatch(spanish.html, /Ana <script>/);
assert.doesNotMatch(spanish.html, /resend/i);
assert.match(spanish.html, /background:#16a34a/);
assert.match(spanish.html, /Unatomo/);
assert.doesNotMatch(spanish.html, /Un Átomo/);

const english = renderWelcomeEmail({
  displayName: "Alex",
  language: "en",
});
assert.equal(english.subject, "Welcome to UNATOMO/NFC");
assert.match(english.html, /Verify my email/);
assert.match(english.text, /https:\/\/unatomo\.com\/nfc/);

const approvedSpanish = renderEmailTemplate("registration_code_approved", {
  displayName: "Mónica",
  actionUrl: "https://unatomo.com/nfc/es/auth/registro.html?code=ABC123",
  code: "ABC123",
  expiresText: "7 días",
}, "es");
assert.match(approvedSpanish.html, /los próximos 7 días/);
assert.doesNotMatch(approvedSpanish.html, /las próximas 7 días/);

assert.equal(EMAIL_TEMPLATE_DEFINITIONS.length, 11);
assert.equal(
  EMAIL_TEMPLATE_DEFINITIONS.filter((item) => item.integration === "active").length,
  11,
);
const previousEmailNotice = renderEmailTemplate("email_change_old", {
  displayName: "Alex",
  newEmail: "ne***@example.com",
}, "en");
assert.match(previousEmailNotice.text, /ne\*\*\*@example\.com/);
assert.doesNotMatch(previousEmailNotice.html, /Secure my account/);
const accountDeleted = renderEmailTemplate("account_activity", {
  displayName: "Alex",
  activityTitle: "Account deleted",
  activityDetail: "Your account was deleted.",
}, "en");
assert.match(accountDeleted.text, /Your account was deleted/);
assert.doesNotMatch(accountDeleted.html, /Review my account/);
EMAIL_TEMPLATE_DEFINITIONS.forEach((definition) => {
  ["es", "en"].forEach((language) => {
    const rendered = renderEmailTemplate(definition.id, {
      displayName: "Alex <script>",
      actionUrl: "https://unatomo.com/nfc",
    }, language);
    assert.ok(rendered.subject);
    assert.match(rendered.html, /Unatomo/);
    assert.doesNotMatch(rendered.html, /Alex <script>/);
    assert.ok(rendered.text);
  });
});

console.log("email template tests passed");
