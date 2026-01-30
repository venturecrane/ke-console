import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface SyncUserRequest {
  id: string;
  email: string;
  name: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyncUserRequest;
    const { id, email, name } = body;

    if (!id || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Sync user to backend API (ke-api worker)
    const response = await fetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, email, name }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to sync user to backend:", error);
      return NextResponse.json(
        { error: "Failed to sync user" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in sync-user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
