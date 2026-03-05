// VSee API — calls go through Netlify serverless function (no CORS issues)

const API_URL = '/.netlify/functions/create-visit';

export async function createVisit(patient) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Server error (${res.status})`);
  }

  return data;
}
