'use client'
import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import {
  defineRuleBlocks, setBlocklyContext, buildToolbox, makeTheme,
} from '@/lib/automations/blocklyConfig'
import { loadRuleIntoWorkspace, workspaceToRule } from '@/lib/automations/blocklySerde'

// Niotron-style block canvas for a single rule. Renders one Blockly workspace,
// emits the canonical rule JSON on every meaningful edit.
export default function RuleBlocklyCanvas({ rule, ctx, onChange }) {
  const hostRef = useRef(null)
  const wsRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const loadingRef = useRef(false)
  const targetRef = useRef(rule?.target || 'lead')
  const loadedIdRef = useRef(null)
  onChangeRef.current = onChange

  // Keep the latest dynamic lists available to block dropdowns.
  const applyCtx = (target) => setBlocklyContext({
    target,
    stages: ctx?.stages || [],
    tags: ctx?.tags || [],
    staff: ctx?.staff || [],
    customFields: ctx?.customFields || [],
  })

  const loadRule = (r) => {
    const ws = wsRef.current
    if (!ws || !r) return
    loadingRef.current = true
    targetRef.current = r.target || 'lead'
    applyCtx(targetRef.current)
    try {
      ws.updateToolbox(buildToolbox(targetRef.current))
      loadRuleIntoWorkspace(ws, r)
    } catch (e) {
      console.error('[blockly] load failed:', e)
    }
    loadedIdRef.current = r.id
    setTimeout(() => { loadingRef.current = false; Blockly.svgResize(ws) }, 0)
  }

  // Mount: define blocks, inject the workspace, wire change events.
  useEffect(() => {
    if (!hostRef.current) return
    defineRuleBlocks()
    applyCtx(rule?.target || 'lead')

    const ws = Blockly.inject(hostRef.current, {
      toolbox: buildToolbox(rule?.target || 'lead'),
      theme: makeTheme(),
      renderer: 'zelos',
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 0.95, maxScale: 2, minScale: 0.4 },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 3, colour: '#e2e8f0', snap: true },
    })
    wsRef.current = ws

    const emit = () => {
      if (loadingRef.current) return
      const updated = workspaceToRule(ws)
      if (updated.target && updated.target !== targetRef.current) {
        targetRef.current = updated.target
        setBlocklyContext({ target: updated.target })
        try { ws.updateToolbox(buildToolbox(updated.target)) } catch {}
      }
      onChangeRef.current?.(updated)
    }

    let t = null
    ws.addChangeListener((e) => {
      if (e.isUiEvent || loadingRef.current) return
      clearTimeout(t)
      t = setTimeout(emit, 250)
    })

    loadRule(rule)

    const ro = new ResizeObserver(() => Blockly.svgResize(ws))
    ro.observe(hostRef.current)

    return () => {
      clearTimeout(t)
      ro.disconnect()
      ws.dispose()
      wsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switching the selected rule → reload the workspace.
  useEffect(() => {
    if (wsRef.current && rule && rule.id !== loadedIdRef.current) loadRule(rule)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule?.id])

  return (
    <div
      ref={hostRef}
      className="w-full rounded-xl border border-(--color-border) overflow-hidden"
      style={{ height: 560, background: '#f8fafc' }}
    />
  )
}
