import {getSafeMobileQrUrl} from "./mobileQrUrl.mjs";

export const createMobileQrScanner = ({ isEnglish = false } = {}) => {
  const cameraInput = document.createElement("input");
  cameraInput.type = "file";
  cameraInput.accept = "image/*";
  cameraInput.setAttribute("capture", "environment");
  cameraInput.hidden = true;
  cameraInput.setAttribute("aria-hidden", "true");
  document.body.appendChild(cameraInput);

  const overlay = document.createElement("div");
  overlay.className = "mobile-qr-scanner";
  overlay.hidden = true;
  overlay.innerHTML = `
    <video class="mobile-qr-scanner-video" playsinline muted></video>
    <div class="mobile-qr-scanner-shade" aria-hidden="true">
      <span class="mobile-qr-scanner-frame"></span>
    </div>
    <button type="button" class="mobile-qr-scanner-close" aria-label="${isEnglish ? "Close scanner" : "Cerrar escáner"}">×</button>
    <p class="mobile-qr-scanner-status" role="status"></p>
  `;
  document.body.appendChild(overlay);

  const video = overlay.querySelector(".mobile-qr-scanner-video");
  const closeButton = overlay.querySelector(".mobile-qr-scanner-close");
  const status = overlay.querySelector(".mobile-qr-scanner-status");
  let stream = null;
  let detector = null;
  let scanFrame = null;
  let detecting = false;

  const setStatus = (es, en) => {
    status.textContent = isEnglish ? en : es;
  };

  const stopCamera = () => {
    if (scanFrame) window.cancelAnimationFrame(scanFrame);
    scanFrame = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    detecting = false;
  };

  const close = () => {
    stopCamera();
    overlay.hidden = true;
  };

  const detectQr = async () => {
    if (!stream || overlay.hidden) return;
    if (!detecting && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      detecting = true;
      try {
        const codes = await detector.detect(video);
        const value = codes.find((code) => code.rawValue)?.rawValue;
        if (value) {
          const url = getSafeMobileQrUrl(value, window.location.origin);
          if (url) {
            stopCamera();
            window.location.assign(url.href);
            return;
          }
          setStatus(
            "El QR no corresponde a una dirección válida de UNATOMO.",
            "This QR does not contain a valid UNATOMO address."
          );
        }
      } catch {
        // A busy frame can fail transiently; continue scanning.
      } finally {
        detecting = false;
      }
    }
    scanFrame = window.requestAnimationFrame(detectQr);
  };

  const open = async () => {
    if (!("BarcodeDetector" in window)) {
      cameraInput.value = "";
      cameraInput.click();
      return;
    }
    overlay.hidden = false;
    setStatus("Apunta la cámara al código QR.", "Point the camera at the QR code.");
    closeButton.focus();
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats?.();
      if (formats && !formats.includes("qr_code")) throw new Error("qr_not_supported");
      detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      scanFrame = window.requestAnimationFrame(detectQr);
    } catch {
      stopCamera();
      setStatus(
        "No se pudo abrir la cámara. Revisa el permiso del navegador.",
        "The camera could not be opened. Check the browser permission."
      );
    }
  };

  closeButton.addEventListener("click", close);

  return {
    element: overlay,
    open,
    close,
    destroy: () => {
      closeButton.removeEventListener("click", close);
      close();
      cameraInput.remove();
      overlay.remove();
    }
  };
};
