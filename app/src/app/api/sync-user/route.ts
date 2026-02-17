import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST() {
  try {
    const { userId, getToken } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const token = await getToken()

    // Sync user to backend API (ke-api worker)
    const response = await fetch(`${API_URL}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        email: user.primaryEmailAddress?.emailAddress,
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.username || null,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to sync user to backend:', error)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in sync-user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
