const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Family {
  id: string;
  name: string | null;
  parent_a_id: string;
  parent_b_id: string | null;
  parent_a_ratio: number;
  invite_code: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeResponse {
  user: User;
  family: Family | null;
  role: "parent_a" | "parent_b" | null;
}

export interface FamilyWithParents {
  family: Family;
  parentA: User;
  parentB: User | null;
}

export interface ApiError {
  error: string;
  details?: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  userId?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(userId ? { "X-User-Id": userId } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || "Request failed");
  }

  return data as T;
}

export async function getMe(userId: string): Promise<MeResponse> {
  return apiRequest<MeResponse>("/me", { method: "GET" }, userId);
}

export async function createFamily(
  userId: string,
  name?: string
): Promise<{ success: boolean; family: Family }> {
  return apiRequest("/families", {
    method: "POST",
    body: JSON.stringify({ userId, name }),
  });
}

export async function getFamily(
  userId: string,
  familyId: string
): Promise<FamilyWithParents> {
  return apiRequest<FamilyWithParents>(
    `/families/${familyId}`,
    { method: "GET" },
    userId
  );
}

export async function generateInviteCode(
  userId: string,
  familyId: string
): Promise<{ success: boolean; inviteCode: string; expiresAt: string }> {
  return apiRequest(
    `/families/${familyId}/invite`,
    { method: "POST" },
    userId
  );
}

export async function joinFamily(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; family: Family }> {
  return apiRequest("/families/join", {
    method: "POST",
    body: JSON.stringify({ userId, inviteCode }),
  });
}
