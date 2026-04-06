import { useState, useEffect, useRef } from 'react'
import { create } from 'zustand'

// Toast store
const useToastStore = create((set, get) => ({
  toasts: [],
  add: (msg, type = 'info') => {
    const id = Date.now()
    set({ toasts: [...get().toasts, { id, msg, type }] })
    setTimeout(() => set({ toasts: get().toasts.filter(t => t.id !== id) }), 3000)
  },
}))

export function Toast() {
  const { toasts } = useToastStore()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

export const toast = {
  success: (msg) => useToastStore.getState().add(msg, 'success'),
  error: (msg) => useToastStore.getState().add(msg, 'error'),
  info: (msg) => useToastStore.getState().add(msg, 'info'),
}

export function Modal({ open, onClose, title, children, footer, maxWidth = '480px' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

export function Spinner() {
  return <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--amber)', borderRadius: '50%' }} className="animate-spin" />
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12, color: 'var(--text-muted)' }}>
      <span style={{ fontSize: 48 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>{title}</span>
      {subtitle && <span style={{ fontSize: 13 }}>{subtitle}</span>}
      {action}
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-amber'}`} onClick={() => { onConfirm(); onClose(); }}>Ya, Lanjutkan</button>
      </>}
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{message}</p>
    </Modal>
  )
}
