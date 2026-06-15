'use client'
import { useState, useEffect } from 'react'
import {
  Users, Plus, Trash2, X, Mail, CheckCircle2, Send, Lock, Phone, Clock, ChevronDown,
} from 'lucide-react'
import { Button, Card, Input, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { logAudit, AUDIT } from '@/lib/audit'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

const EMPTY_FORM = { name: '', designation: '', description: '', phone: '', email: '', roleId: '' }

export default function UsersPage() {
  const { org, orgId } = useOrg()
  const [staff, setStaff] = useState(() => org?.settings?.staff_members || [])
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Track which member's role dropdown is open
  const [roleChanging, setRoleChanging] = useState({}) // { [memberId]: 'saving' | 'done' | undefined }
  const [resending, setResending] = useState({}) // { [memberId]: true }

  const resetForm = () => {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
  }

  useEffect(() => {
    if (!orgId || roles.length > 0) return
    setRolesLoading(true)
    fetch(`/api/admin/roles?orgId=${orgId}`)
      .then(r => r.json())
      .then(d => { if (d.roles) setRoles(d.roles) })
      .catch(() => {})
      .finally(() => setRolesLoading(false))
  }, [orgId])

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          designation: form.designation.trim(),
          description: form.description.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          roleId: form.roleId || null,
          orgId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation')

      logAudit({
        action: AUDIT.USER_CREATE,
        description: `Invited CRM user: ${form.name} (${form.email})`,
        metadata: { name: form.name, email: form.email, designation: form.designation },
      })

      const roleName = roles.find(r => r.id === form.roleId)?.name || null
      const newMember = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        designation: form.designation.trim(),
        description: form.description.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        has_login: true,
        status: 'invited',
        role_id: form.roleId || null,
        role_name: roleName,
      }
      setStaff(prev => [...prev, newMember])
      setSuccess(`Invitation sent to ${form.email}`)
      setForm(EMPTY_FORM)
    } catch (err) { setError(err.message) }
    finally { setSending(false) }
  }

  const handleResendInvite = async (member) => {
    setResending(prev => ({ ...prev, [member.id]: true }))
    try {
      const res = await fetch('/api/admin/resend-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: member.email,
          authUserId: member.auth_user_id || null,
          memberId: member.id,
          name: member.name,
          designation: member.designation || '',
          roleId: member.role_id || null,
          orgId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend')
      if (data.newAuthUserId) {
        setStaff(prev => prev.map(m =>
          m.id === member.id ? { ...m, auth_user_id: data.newAuthUserId } : m
        ))
      }
      toast({ type: 'success', title: 'Invitation resent', message: `Fresh invite email sent to ${member.email}` })
    } catch (err) {
      toast({ type: 'error', title: 'Resend failed', message: err.message })
    } finally {
      setResending(prev => { const n = { ...prev }; delete n[member.id]; return n })
    }
  }

  const handleRoleChange = async (member, newRoleId) => {
    setRoleChanging(prev => ({ ...prev, [member.id]: 'saving' }))
    try {
      const res = await fetch('/api/admin/user-role', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          authUserId: member.auth_user_id || null,
          roleId: newRoleId || null,
          orgId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')

      const roleName = roles.find(r => r.id === newRoleId)?.name || null
      setStaff(prev => prev.map(m =>
        m.id === member.id ? { ...m, role_id: newRoleId || null, role_name: roleName } : m
      ))
      setRoleChanging(prev => ({ ...prev, [member.id]: 'done' }))
      setTimeout(() => setRoleChanging(prev => { const n = { ...prev }; delete n[member.id]; return n }), 1500)
    } catch (err) {
      toast({ type: 'error', title: 'Role update failed', message: err.message })
      setRoleChanging(prev => { const n = { ...prev }; delete n[member.id]; return n })
    }
  }

  const handleDelete = async (id) => {
    const member = staff.find(m => m.id === id)
    const ok = await showConfirm({
      title: `Remove ${member?.name || 'team member'}?`,
      message: 'This will permanently delete their login access.',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    try {
      const res = await fetch('/api/admin/remove-user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ memberId: id, authUserId: member?.auth_user_id || null, orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')
      logAudit({
        action: AUDIT.PERMISSION_CHANGE,
        description: `Team member removed: ${member?.name || 'member'}`,
        metadata: { name: member?.name, email: member?.email },
      })
      setStaff(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Users size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Team Members</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Staff who can log into this CRM workspace</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Invite Member
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 rounded-xl border border-(--color-border) space-y-4" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-600 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Send size={14} style={{ color: 'var(--color-brand)' }} />
                Invite a new team member
              </p>
              <button type="button" onClick={resetForm} className="p-1 rounded-lg hover:bg-(--color-brand-50)">
                <X size={15} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg text-xs font-500" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="px-3 py-2 rounded-lg text-xs font-500 flex items-center gap-1.5" style={{ background: '#dcfce7', color: '#15803d' }}>
                <CheckCircle2 size={12} /> {success}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Full Name *" placeholder="Dr. Ramesh Kumar" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Input label="Designation" placeholder="General Physician" value={form.designation}
                  onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
              </div>
              <Input label="Short Description" placeholder="Brief note about this team member" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Phone" type="tel" placeholder="+91 98765 43210" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <Input label="Email *" type="email" placeholder="doctor@clinic.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Role</label>
                <select
                  value={form.roleId}
                  onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                  disabled={rolesLoading}
                >
                  <option value="">{rolesLoading ? 'Loading roles…' : 'Select a role (optional)'}</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
                <Button variant="secondary" size="sm" type="button" onClick={resetForm}>Cancel</Button>
                <Button size="sm" type="submit" disabled={sending || !form.name.trim() || !form.email.trim()}>
                  <Send size={14} />
                  {sending ? 'Sending…' : 'Send Invitation'}
                </Button>
              </div>
            </form>

            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              The invite link expires in 24 hours. The user will set their own password after clicking the link.
            </p>
          </div>
        )}

        {staff.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No team members yet. Invite someone to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {staff.map(m => {
              const roleState = roleChanging[m.id]
              return (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-(--color-border) group" style={{ background: 'var(--color-surface-2)' }}>
                  <Avatar name={m.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{m.name}</p>
                      {m.has_login && m.status === 'invited' && (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: '#fef9c3', color: '#a16207' }}>
                            <Clock size={9} /> Invite pending
                          </span>
                          <button
                            type="button"
                            disabled={resending[m.id]}
                            onClick={() => handleResendInvite(m)}
                            className="inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                          >
                            <Send size={9} />
                            {resending[m.id] ? 'Sending…' : 'Resend'}
                          </button>
                        </>
                      )}
                      {m.has_login && m.status !== 'invited' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                          <Lock size={9} /> Active
                        </span>
                      )}
                    </div>
                    {m.designation && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{m.designation}</p>}
                    {m.email && (
                      <p className="text-[11px] flex items-center gap-1 mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        <Mail size={10} />{m.email}
                      </p>
                    )}
                    {m.phone && (
                      <p className="text-[11px] flex items-center gap-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        <Phone size={10} />{m.phone}
                      </p>
                    )}
                    {m.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{m.description}</p>}

                    {/* Role selector */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative flex-1 max-w-[180px]">
                        <select
                          value={m.role_id || ''}
                          disabled={rolesLoading || roleState === 'saving'}
                          onChange={e => handleRoleChange(m, e.target.value || null)}
                          className="w-full pl-2 pr-6 py-1 text-[11px] font-500 rounded-md border border-(--color-border) outline-none appearance-none cursor-pointer"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                        >
                          <option value="">No role</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                      {roleState === 'saving' && (
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Saving…</span>
                      )}
                      {roleState === 'done' && (
                        <span className="text-[10px]" style={{ color: '#15803d' }}>Saved ✓</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
