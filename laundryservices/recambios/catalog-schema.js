const LANGUAGES = ["es", "en", "it", "el"];
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const MAX_DOCUMENT_BYTES = 900_000;

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const byteSize = (value) => new TextEncoder().encode(JSON.stringify(value)).length;

const requireText = (value, path, errors) => {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} debe contener texto.`);
    return false;
  }
  return true;
};

const requireUniqueIds = (items, path, errors) => {
  const ids = new Set();
  items.forEach((item, index) => {
    const id = item?.id;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      errors.push(`${path}[${index}].id no es válido.`);
      return;
    }
    if (ids.has(id)) errors.push(`${path}[${index}].id está duplicado: ${id}.`);
    ids.add(id);
  });
  return ids;
};

export const summarizeLaundryCatalog = (catalog) => ({
  manufacturers: catalog?.manufacturers?.length || 0,
  modelGroups: catalog?.models?.length || 0,
  models: (catalog?.models || []).reduce(
    (total, group) => total + (Array.isArray(group.models) ? group.models.length : 0),
    0
  ),
  spareParts: catalog?.spareParts?.length || 0,
});

export function validateLaundryCatalog(catalog) {
  const errors = [];
  if (!isRecord(catalog)) return { valid: false, errors: ["El catálogo debe ser un objeto JSON."] };
  if (!Number.isInteger(catalog.version) || catalog.version < 1) {
    errors.push("version debe ser un número entero positivo.");
  }
  if (typeof catalog.updatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(catalog.updatedAt)) {
    errors.push("updatedAt debe usar el formato AAAA-MM-DD.");
  }

  const arrayFields = ["categories", "manufacturers", "models", "spareParts"];
  arrayFields.forEach((field) => {
    if (!Array.isArray(catalog[field])) errors.push(`${field} debe ser una lista.`);
  });
  if (errors.some((error) => error.endsWith("debe ser una lista."))) {
    return { valid: false, errors };
  }
  if (catalog.manufacturers.length > 498) {
    errors.push("El catálogo supera el máximo de fabricantes por publicación atómica.");
  }
  if (byteSize({ items: catalog.categories }) > MAX_DOCUMENT_BYTES) {
    errors.push("El documento de categorías supera el tamaño seguro de Firestore.");
  }

  const categoryIds = requireUniqueIds(catalog.categories, "categories", errors);
  catalog.categories.forEach((category, index) => {
    if (!isRecord(category?.label)) {
      errors.push(`categories[${index}].label debe contener las traducciones.`);
      return;
    }
    LANGUAGES.forEach((language) => {
      requireText(category.label[language], `categories[${index}].label.${language}`, errors);
    });
  });

  const manufacturerIds = requireUniqueIds(catalog.manufacturers, "manufacturers", errors);
  catalog.manufacturers.forEach((manufacturer, index) => {
    requireText(manufacturer?.name, `manufacturers[${index}].name`, errors);
    ["aliases", "brands"].forEach((field) => {
      if (manufacturer?.[field] !== undefined &&
          (!Array.isArray(manufacturer[field]) ||
           manufacturer[field].some((value) => typeof value !== "string"))) {
        errors.push(`manufacturers[${index}].${field} debe ser una lista de texto.`);
      }
    });
  });

  catalog.models.forEach((group, index) => {
    if (!manufacturerIds.has(group?.manufacturerId)) {
      errors.push(`models[${index}].manufacturerId no existe: ${group?.manufacturerId || "-"}.`);
    }
    if (!categoryIds.has(group?.categoryId)) {
      errors.push(`models[${index}].categoryId no existe: ${group?.categoryId || "-"}.`);
    }
    requireText(group?.family, `models[${index}].family`, errors);
    if (!Array.isArray(group?.models) || !group.models.length ||
        group.models.some((model) => typeof model !== "string" || !model.trim())) {
      errors.push(`models[${index}].models debe contener al menos un modelo válido.`);
    }
  });

  catalog.spareParts.forEach((part, index) => {
    if (!manufacturerIds.has(part?.manufacturerId)) {
      errors.push(`spareParts[${index}].manufacturerId no existe: ${part?.manufacturerId || "-"}.`);
    }
    if (part?.categoryId && !categoryIds.has(part.categoryId)) {
      errors.push(`spareParts[${index}].categoryId no existe: ${part.categoryId}.`);
    }
    if (!requireText(part?.id, `spareParts[${index}].id`, errors)) return;
    requireText(part?.name, `spareParts[${index}].name`, errors);
  });

  catalog.manufacturers.forEach((manufacturer) => {
    const document = {
      manufacturer,
      modelGroups: catalog.models.filter(({ manufacturerId }) => manufacturerId === manufacturer.id),
      spareParts: catalog.spareParts.filter(({ manufacturerId }) => manufacturerId === manufacturer.id),
    };
    if (byteSize(document) > MAX_DOCUMENT_BYTES) {
      errors.push(`El documento del fabricante ${manufacturer.id} supera el tamaño seguro de Firestore.`);
    }
  });
  return { valid: errors.length === 0, errors };
}

export function parseLaundryCatalog(source) {
  let catalog;
  try {
    catalog = JSON.parse(source);
  } catch (error) {
    return { valid: false, errors: [`JSON no válido: ${error.message}`], catalog: null };
  }
  return { ...validateLaundryCatalog(catalog), catalog };
}

export const formatLaundryCatalog = (catalog) => `${JSON.stringify(catalog, null, 2)}\n`;
