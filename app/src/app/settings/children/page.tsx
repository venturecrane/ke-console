'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse, Child } from '@/lib/api'
import { Button, Card, CardHeader, CardBody, Alert, EmptyState } from '@/components/ui'

export default function ChildrenSettingsPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add child form
  const [newChildName, setNewChildName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Delete state
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Edit state (issue 105)
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const fetchChildren = useCallback(async () => {
    if (!user || !meData?.family) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.getChildren(meData.family.id)
      setChildren(data.children)
    } catch (err) {
      console.error('Failed to fetch children:', err)
      setError('Failed to load children. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user, meData?.family, api])

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return
      try {
        const data = await api.getMe()
        setMeData(data)
      } catch (err) {
        console.error('Failed to load user data:', err)
        setError('Failed to load user data. Please try again.')
      }
    }

    if (isLoaded && user) {
      loadUserData()
    }
  }, [isLoaded, user, api])

  // Fetch children when user data is loaded
  useEffect(() => {
    if (meData?.family) {
      fetchChildren()
    }
  }, [meData?.family, fetchChildren])

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !meData?.family) return

    const trimmedName = newChildName.trim()
    if (!trimmedName) {
      setAddError('Please enter a name')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      const newChild = await api.createChild(meData.family.id, trimmedName)
      setChildren((prev) => [...prev, newChild])
      setNewChildName('')
    } catch (err) {
      console.error('Failed to add child:', err)
      setAddError(err instanceof Error ? err.message : 'Failed to add child')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDeleteChild(childId: string) {
    if (!user || !meData?.family) return

    setDeletingChildId(childId)

    try {
      await api.deleteChild(meData.family.id, childId)
      setChildren((prev) => prev.filter((c) => c.id !== childId))
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete child:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete child')
    } finally {
      setDeletingChildId(null)
    }
  }

  function startEdit(child: Child) {
    setEditingChildId(child.id)
    setEditName(child.name)
    setEditError(null)
    // Close any open delete confirm
    setShowDeleteConfirm(null)
  }

  function cancelEdit() {
    setEditingChildId(null)
    setEditName('')
    setEditError(null)
  }

  async function handleEditChild(childId: string) {
    if (!user || !meData?.family) return

    const trimmedName = editName.trim()
    if (!trimmedName) {
      setEditError('Name is required')
      return
    }
    if (trimmedName.length > 100) {
      setEditError('Name must be 100 characters or less')
      return
    }

    setIsEditing(true)
    setEditError(null)

    try {
      const updated = await api.updateChild(meData.family.id, childId, trimmedName)
      setChildren((prev) => prev.map((c) => (c.id === childId ? updated : c)))
      setEditingChildId(null)
      setEditName('')
    } catch (err) {
      console.error('Failed to update child:', err)
      setEditError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setIsEditing(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  if (!meData?.family) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-ke-primary">Manage Kids</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardBody className="text-center">
              <p className="text-ke-secondary">You need to create or join a family first.</p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardBody>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Manage Kids</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Error Display */}
        {error && (
          <Alert variant="error" className="mb-6">
            <p>{error}</p>
          </Alert>
        )}

        {/* Add Child Form */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="mb-4 text-lg font-medium text-ke-primary">Add a Kid</h2>
            <form onSubmit={handleAddChild} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => {
                    setNewChildName(e.target.value)
                    setAddError(null)
                  }}
                  placeholder="Kid's name"
                  maxLength={100}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
                {addError && <p className="mt-1 text-sm text-ke-negative">{addError}</p>}
              </div>
              <Button type="submit" disabled={isAdding || !newChildName.trim()}>
                {isAdding ? 'Adding...' : 'Add Kid'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Children List */}
        <Card>
          <CardHeader className="border-b border-ke-border">
            <h2 className="text-lg font-medium text-ke-primary">Kids ({children.length})</h2>
            <p className="mt-1 text-sm text-ke-muted">
              Add kids to tag expenses to specific family members.
            </p>
          </CardHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-ke-muted">Loading kids...</p>
            </div>
          ) : children.length === 0 ? (
            <EmptyState
              title="No kids added yet"
              description="Add your kids above to tag expenses to them."
              className="border-0 rounded-none"
            />
          ) : (
            <ul className="divide-y divide-ke-divider">
              {children.map((child) => (
                <li key={child.id} className="px-6 py-4">
                  {editingChildId === child.id ? (
                    /* Inline Edit Mode */
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ke-elevated">
                          <span className="text-lg font-medium text-ke-secondary">
                            {editName.charAt(0)?.toUpperCase() ||
                              child.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value)
                            setEditError(null)
                          }}
                          maxLength={100}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleEditChild(child.id)
                            } else if (e.key === 'Escape') {
                              cancelEdit()
                            }
                          }}
                          className="flex-1 rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                        />
                      </div>
                      {editError && (
                        <p className="ml-[52px] text-sm text-ke-negative">{editError}</p>
                      )}
                      <div className="ml-[52px] flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditChild(child.id)}
                          disabled={isEditing || !editName.trim()}
                        >
                          {isEditing ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={isEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ke-elevated">
                          <span className="text-lg font-medium text-ke-secondary">
                            {child.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-ke-primary">{child.name}</p>
                          <p className="text-sm font-mono text-ke-muted">
                            Added {new Date(child.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {showDeleteConfirm === child.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-ke-muted">Delete?</span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteChild(child.id)}
                            disabled={deletingChildId === child.id}
                          >
                            {deletingChildId === child.id ? '...' : 'Yes'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(null)}
                            disabled={deletingChildId === child.id}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(child)}
                            className="rounded-lg p-2 text-ke-muted transition-colors hover:bg-ke-elevated hover:text-ke-secondary"
                            title="Edit kid name"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(child.id)}
                            className="rounded-lg p-2 text-ke-muted transition-colors hover:bg-ke-elevated hover:text-ke-negative"
                            title="Delete kid"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Info Note */}
        <Alert variant="info" className="mt-6">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium">Note about deleted kids</p>
              <p className="mt-1">
                When you delete a kid, they are hidden from this list but preserved for historical
                expense records. Any expenses tagged to a deleted kid will still show that
                association.
              </p>
            </div>
          </div>
        </Alert>
      </main>
    </div>
  )
}
