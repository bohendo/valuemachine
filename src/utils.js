const emptyForm = (form) => {
  const emptyForm = JSON.parse(JSON.stringify(form))
  for (const key of Object.keys(emptyForm)) {
    emptyForm[key] = "";
  }
  return emptyForm;
};

// Replace any values in "form" with "values"
const mergeForms = (form, values) => {
  const newForm = JSON.parse(JSON.stringify(form))
  for (const key of Object.keys(newForm)) {
    if (values[key]) {
      newForm[key] = values[key];
    }
  }
  return newForm;
};

module.exports = { emptyForm, mergeForms }
