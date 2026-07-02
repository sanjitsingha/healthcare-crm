'use client'
import { useEffect, useState } from 'react'
import { Plus, Tag, Search, Edit2, Trash2 } from 'lucide-react'
import { Button, Card, Modal, Input, Spinner } from '@/components/ui'
import { getTags, createTag } from '@/lib/supabase/queries'

export default function TagsPage() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#135BFB' })
  const [saving, setSaving] = useState(false)

  const loadTags = async () => {
    setLoading(true)
    try {
      const data = await getTags()
      setTags(data || [])
    } catch (err) {
      console.error('Failed to load tags:', err)
      setTags([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newTag.name.trim()) return
    setSaving(true)
    try {
      await createTag({
        ...newTag,
        organization_id: '00000000-0000-0000-0000-000000000000'
      })
      await loadTags()
      setCreateOpen(false)
      setNewTag({ name: '', color: '#135BFB' })
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Tag Management</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage categories for leads and patients</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Tag
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tags.map(tag => (
            <Card key={tag.id} className="p-4 flex items-center justify-between border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                  <Edit2 size={14} />
                </button>
                <button className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
          {tags.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed rounded-xl">
              <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No tags created yet.</p>
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Tag">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tag Name *"
            placeholder="e.g. VIP Patient"
            value={newTag.name}
            onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
            required
          />
          <div className="space-y-1">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tag Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={newTag.color}
                onChange={e => setNewTag(t => ({ ...t, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-[var(--color-border)] p-1 cursor-pointer"
              />
              <Input
                className="flex-1"
                value={newTag.color}
                onChange={e => setNewTag(t => ({ ...t, color: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Tag'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
