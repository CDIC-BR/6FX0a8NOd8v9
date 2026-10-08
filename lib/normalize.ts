export function normalizeDioceseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*-\s*[a-z]{2}\s*-?\s*$/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^diocese de /, "diocese ")
    .replace(/^arquidiocese de /, "arquidiocese ");
}
