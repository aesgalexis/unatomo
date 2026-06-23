const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateRegistrationCode = (length = 8) => {
  let value = "";
  for (let idx = 0; idx < length; idx += 1) {
    const next = Math.floor(Math.random() * CODE_ALPHABET.length);
    value += CODE_ALPHABET[next];
  }
  return value;
};

export const normalizeRegistrationCode = (value: string) =>
  (value || "").toString().trim().toUpperCase();
