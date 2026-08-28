const assert = require("node:assert/strict");
const {
  renderLaundrySpareConfirmation,
  renderLaundrySpareEmail,
} = require("../lib/laundry/spareRequestEmails.js");
const {
  normalizeRequest,
} = require("../lib/laundry/spareRequestValidation.js");

const baseRequest = {
  submissionId: "request-123456789",
  manufacturer: "Girbau",
  allianceBrand: "",
  category: "Lavadora",
  model: "HS-6024",
  spareName: "Goma de puerta",
  partReference: "",
  quantity: 2,
  description: "Medida <script>",
  contactName: "Ana <script>",
  email: "ana@example.com",
  phone: "",
  legalName: "Lavandería Demo",
  taxId: "B12345678",
  country: "España",
  fiscalAddress: "Calle Demo 1",
  postalCode: "28001",
  city: "Madrid",
  province: "Madrid",
  privacyAccepted: true,
  images: [{name: "plate.jpg", type: "image/jpeg", content: "content"}],
};

const expectedCopy = {
  es: /Hemos recibido tu solicitud/,
  en: /We have received your request/,
  it: /Abbiamo ricevuto la tua richiesta/,
  el: /Λάβαμε το αίτημά σας/,
};

Object.entries(expectedCopy).forEach(([language, expected]) => {
  const confirmation = renderLaundrySpareConfirmation({
    ...baseRequest,
    language,
  });
  assert.match(confirmation.html, new RegExp(`<html lang="${language}">`));
  assert.match(confirmation.html, expected);
  assert.doesNotMatch(confirmation.html, /Ana <script>/);
  assert.match(confirmation.html, /Ana &lt;script&gt;/);
  assert.ok(confirmation.subject.endsWith("REQUEST-"));
  assert.ok(confirmation.text);
});

const normalizedItalian = normalizeRequest({
  ...baseRequest,
  language: "it",
  quantity: 200,
});
assert.equal(normalizedItalian.language, "it");
assert.equal(normalizedItalian.quantity, 99);
assert.equal(normalizeRequest({...baseRequest, language: "fr"}).language, "es");

const internal = renderLaundrySpareEmail({...baseRequest, language: "es"});
assert.doesNotMatch(internal.html, /Medida <script>/);
assert.match(internal.html, /Medida &lt;script&gt;/);

console.log("laundry spare request tests passed");
