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
assert.match(english.html, /Open my dashboard/);
assert.match(english.text, /https:\/\/unatomo\.com\/nfc/);

assert.equal(EMAIL_TEMPLATE_DEFINITIONS.length, 11);
assert.equal(
  EMAIL_TEMPLATE_DEFINITIONS.filter((item) => item.integration === "active").length,
  7,
);
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
