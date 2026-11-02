const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchPublicBooks({ page = 1, pageSize = 12 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const response = await fetch(`${API_BASE}/public/books/?${params}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message ?? "Unable to load books.");
  }

  return data;
}
