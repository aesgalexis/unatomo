export type LaundryLanguage = "es" | "en" | "it" | "el";

export type ImageInput = {
  name: string;
  type: string;
  content: string;
};

export type SpareRequest = {
  submissionId: string;
  language: LaundryLanguage;
  manufacturer: string;
  allianceBrand: string;
  category: string;
  model: string;
  spareName: string;
  partReference: string;
  quantity: number;
  description: string;
  contactName: string;
  email: string;
  phone: string;
  legalName: string;
  taxId: string;
  country: string;
  fiscalAddress: string;
  postalCode: string;
  city: string;
  province: string;
  privacyAccepted: boolean;
  images: ImageInput[];
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type ResendPayload = {
  from: string;
  reply_to: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{filename: string; content: string}>;
  tags: Array<{name: string; value: string}>;
};
