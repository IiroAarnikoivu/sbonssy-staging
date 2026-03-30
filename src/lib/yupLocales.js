"use client";

import * as yup from "yup";

// Define Finnish (fi) translations for Yup validation messages
const fiLocale = {
  mixed: {
    required: "Tämä kenttä on pakollinen",
    oneOf: "Arvojen on täsmättävä",
    notOneOf: "Arvo ei saa olla jokin seuraavista: ${values}",
    defined: "Arvon on oltava määritetty",
  },
  string: {
    email: "Anna kelvollinen sähköpostiosoite",
    min: "Vähintään ${min} merkkiä",
    max: "Enintään ${max} merkkiä",
    url: "Anna kelvollinen URL-osoite",
    matches: 'Arvon on vastattava kaavaa: "${regex}"',
    length: "Täsmälleen ${length} merkkiä",
    lowercase: "Arvon on oltava pienaakkosilla",
    uppercase: "Arvon on oltava suuraakkosilla",
    trim: "Arvon on oltava ilman alku- ja loppuvälejä",
  },
  number: {
    min: "Arvon on oltava vähintään ${min}",
    max: "Arvon on oltava enintään ${max}",
    lessThan: "Arvon on oltava pienempi kuin ${less}",
    moreThan: "Arvon on oltava suurempi kuin ${more}",
    positive: "Arvon on oltava positiivinen",
    negative: "Arvon on oltava negatiivinen",
    integer: "Arvon on oltava kokonaisluku",
  },
  date: {
    min: "Päivämäärän on oltava ${min} tai myöhempi",
    max: "Päivämäärän on oltava ${max} tai aiempi",
  },
  array: {
    min: "Valitse vähintään ${min} kohdetta",
    max: "Valitse enintään ${max} kohdetta", 
    length: "Valitse täsmälleen ${length} kohdetta",
  },
  boolean: {
    oneOf: "Sinun on hyväksyttävä käyttöehdot",
  },
  object: {
    noUnknown: "Kentässä ei sallita tuntemattomia avaimia",
  },
};

// Define English (en) messages to keep them friendly and consistent
const enLocale = {
  mixed: {
    required: "This field is required",
    oneOf: "Values must match",
    notOneOf: "Value must not be one of: ${values}",
    defined: "A value is required",
  },
  string: {
    email: "Enter a valid email address",
    min: "Must be at least ${min} characters",
    max: "Must be at most ${max} characters",
    url: "Enter a valid URL",
    matches: 'Must match the pattern: "${regex}"',
    length: "Must be exactly ${length} characters",
    lowercase: "Must be lowercase",
    uppercase: "Must be uppercase",
    trim: "Must not have leading or trailing spaces",
  },
  number: {
    min: "Must be greater than or equal to ${min}",
    max: "Must be less than or equal to ${max}",
    lessThan: "Must be less than ${less}",
    moreThan: "Must be greater than ${more}",
    positive: "Must be a positive number",
    negative: "Must be a negative number",
    integer: "Must be an integer",
  },
  date: {
    min: "Date must be on or after ${min}",
    max: "Date must be on or before ${max}",
  },
  array: {
    min: "Select at least ${min} items", 
    max: "Select at most ${max} items",
    length: "Select exactly ${length} items",
  },
  boolean: {
    oneOf: "You must accept terms and conditions",
  },
  object: {
    noUnknown: "Unknown keys are not allowed",
  },
};

export function configureYupLocale(locale) {
  try {
    const loc = (locale || "").toLowerCase();
    if (loc.startsWith("fi")) {
      yup.setLocale(fiLocale);
    } else if (loc.startsWith("en")) {
      yup.setLocale(enLocale);
    } else {
      // Reset to Yup defaults for other locales
      yup.setLocale({});
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("Failed to configure Yup locale:", err);
    }
  }
}
