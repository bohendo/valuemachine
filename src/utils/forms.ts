export const emptyForm = (form) => {
  const emptyForm = JSON.parse(JSON.stringify(form))
  for (const key of Object.keys(emptyForm)) {
    emptyForm[key] = "";
  }
  return emptyForm;
};

// Replace any values in "form" with "values"
export const mergeForms = (form, values) => {
  const newForm = JSON.parse(JSON.stringify(form))
  for (const key of Object.keys(newForm)) {
    if (values && values[key]) {
      newForm[key] = values[key];
    }
  }
  return newForm;
};

export const translate = (mappings) => (form) => {
  const newForm = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === 'default') { continue; }
    if (!mappings[key]) {
      console.warn(`Key ${key} exists in output data but not in mappings`);
    }
    newForm[mappings[key]] = value;
  }
  return newForm;
}
