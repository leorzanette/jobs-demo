import type { ApplicationInput, JobApplication } from "../types/application";

const API_BASE = "/api/applications";

async function apiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      redirect: "manual",
      ...init,
    });

    if (
      response.type === "opaqueredirect" ||
      response.status === 302 ||
      response.status === 303
    ) {
      throw new Error(
        "Session expired. Please refresh the page and sign in again.",
      );
    }

    return response;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Session expired")) {
      throw err;
    }
    throw new Error(
      "Network error — check your connection and try again. If this persists, refresh the page.",
    );
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchApplications(): Promise<JobApplication[]> {
  const response = await apiFetch(API_BASE);
  return handleResponse<JobApplication[]>(response);
}

export async function createApplicationApi(
  input: ApplicationInput,
): Promise<JobApplication> {
  const response = await apiFetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<JobApplication>(response);
}

export async function updateApplicationApi(
  id: string,
  input: ApplicationInput,
): Promise<JobApplication> {
  const response = await apiFetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<JobApplication>(response);
}

export async function deleteApplicationApi(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    await handleResponse(response);
  }
}
