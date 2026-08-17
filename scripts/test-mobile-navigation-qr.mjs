import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getSafeMobileQrUrl} from
  "../static/js/dashboard/runtime/mobileQrUrl.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const navigation = read(
  "../static/js/dashboard/runtime/mobilePrimaryNavigation.js"
);
const scanner = read("../static/js/dashboard/runtime/mobileQrScanner.js");
const qrPrint = read("../static/js/qr-print/index.js");
const printService = read("../static/js/qr-print/qrPrintService.js");
const printCss = read("../static/css/qr-print.css");

// Mobile navigation must remain a reversible modal surface, not a second
// permanent copy of the dashboard navigation.
assert.match(navigation, /const MOBILE_NAV_QUERY = "\(max-width: 768px\)"/);
assert.match(navigation, /document\.body\.appendChild\(sectionNav\)/);
assert.match(navigation, /placeholder\.parentNode\?\.insertBefore/);
assert.match(navigation, /document\.body\.style\.position = "fixed"/);
assert.match(navigation, /element !== qrScanner\.element/);
assert.match(navigation, /event\.key !== "Escape" \|\| !open/);
assert.match(navigation, /backdrop\.addEventListener\("click", onBackdropClick\)/);
assert.match(navigation, /qrScanner\.destroy\(\)/);
assert.match(navigation, /MOBILE_INFORMATION_SECTIONS\.has\(getHashSection\(\)\)/);

// Scanner fallback, camera lifecycle and navigation are intentionally guarded.
assert.match(scanner, /cameraInput\.accept = "image\/\*"/);
assert.match(scanner, /cameraInput\.setAttribute\("capture", "environment"\)/);
assert.match(scanner, /getSafeMobileQrUrl\(value, window\.location\.origin\)/);
assert.match(scanner, /formats: \["qr_code"\]/);
assert.match(scanner, /facingMode: \{ ideal: "environment" \}/);
assert.match(scanner, /stream\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
assert.match(scanner, /window\.location\.assign\(url\.href\)/);
assert.match(scanner, /if \(!\("BarcodeDetector" in window\)\)/);

const localOrigin = "http://localhost:5174";
assert.equal(
  getSafeMobileQrUrl(`${localOrigin}/nfc/es/m.html?tag=ABC`, localOrigin)?.href,
  `${localOrigin}/nfc/es/m.html?tag=ABC`
);
assert.equal(
  getSafeMobileQrUrl("https://unatomo.com/nfc/en/m.html?tag=ABC", localOrigin)
    ?.origin,
  "https://unatomo.com"
);
assert.equal(getSafeMobileQrUrl("https://unatomo.com/landing/", localOrigin), null);
assert.equal(getSafeMobileQrUrl("https://unatomo.com.evil.test/nfc/es/", localOrigin), null);
assert.equal(getSafeMobileQrUrl("not-a-url", localOrigin), null);

// Printing must restore normal page state whether afterprint fires or not.
assert.match(printService, /clearPrintMode\(\)/);
assert.match(printService, /window\.addEventListener\("afterprint", cleanup\)/);
assert.match(printService, /window\.removeEventListener\("afterprint", cleanup\)/);
assert.match(printService, /window\.setTimeout\(cleanup, 1000\)/);
assert.match(printService, /new URLSearchParams\(window\.location\.search\)/);
assert.match(qrPrint, /getFocusedQrMachineId\(\)/);
assert.match(qrPrint, /selectedTreeMachineId = machines\.some/);
assert.match(qrPrint, /window\.location\.href = text\.login/);
assert.match(printCss, /body\.qr-print-include-back \.qr-print-front-grid/);
assert.match(printCss, /body\.qr-print-include-back \.qr-print-back-grid/);
assert.match(printCss, /@media print/);

console.log(
  "OK: mobile navigation, QR scanner, and print-state safeguards are present."
);
