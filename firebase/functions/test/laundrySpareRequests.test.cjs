const assert = require("node:assert/strict");
const {
  renderLaundrySpareConfirmation,
  renderLaundrySpareEmail,
} = require("../lib/laundry/spareRequestEmails.js");
const {
  assertRequiredFields,
  normalizeRequest,
  validateImages,
} = require("../lib/laundry/spareRequestValidation.js");
const {
  nextSpareRequestRateLimitCount,
} = require("../lib/laundry/spareRequestRateLimitPolicy.js");
const {
  deliverLaundrySpareRequest,
} = require("../lib/laundry/spareRequestWorkflow.js");

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

const validRequest = normalizeRequest({
  ...baseRequest,
  images: [{
    name: "plate.jpg",
    type: "image/jpeg",
    content: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString("base64"),
  }],
});
assert.doesNotThrow(() => assertRequiredFields(validRequest));
assert.doesNotThrow(() => validateImages(validRequest.images));
assert.throws(
  () => assertRequiredFields({...validRequest, privacyAccepted: false}),
  (error) => error.code === "invalid-argument"
);
assert.throws(
  () => validateImages([{...validRequest.images[0], content: "bm90LWEtanBlZw=="}]),
  (error) => error.code === "invalid-argument"
);
assert.equal(nextSpareRequestRateLimitCount(0), 1);
assert.equal(nextSpareRequestRateLimitCount(5), 6);
assert.throws(
  () => nextSpareRequestRateLimitCount(6),
  (error) => error.code === "resource-exhausted"
);

const internal = renderLaundrySpareEmail({...baseRequest, language: "es"});
assert.doesNotMatch(internal.html, /Medida <script>/);
assert.match(internal.html, /Medida &lt;script&gt;/);

const testDeliveryWorkflow = async () => {
  const successfulCalls = [];
  const successful = await deliverLaundrySpareRequest(validRequest, async (...args) => {
    successfulCalls.push(args);
  });
  assert.equal(successful.confirmationSent, true);
  assert.equal(successfulCalls.length, 2);
  assert.match(successfulCalls[0][1], /laundry-spare\/internal\//);
  assert.match(successfulCalls[1][1], /laundry-spare\/confirmation\//);

  let partialCallCount = 0;
  const partial = await deliverLaundrySpareRequest(validRequest, async () => {
    partialCallCount += 1;
    if (partialCallCount === 2) throw new Error("confirmation-failed");
  });
  assert.equal(partial.confirmationSent, false);
  assert.equal(partialCallCount, 2);

  await assert.rejects(
    deliverLaundrySpareRequest(validRequest, async () => {
      throw new Error("internal-delivery-failed");
    }),
    /internal-delivery-failed/
  );
};

testDeliveryWorkflow()
  .then(() => console.log("laundry spare request tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
