export function loadStoredData(key, fallback, validate) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value = JSON.parse(raw)
    return validate(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function storeData(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
