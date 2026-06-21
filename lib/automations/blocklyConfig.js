// Blockly block definitions + theme + toolbox for the Niotron-style rules
// builder. Blocks are generated from the rulesEngine metadata so the visual
// editor always matches what the engine can run. CLIENT-ONLY (imports blockly).
import * as Blockly from 'blockly'
import {
  RULE_TARGETS, RULE_EVENTS, RULE_FIELDS, RULE_OPS, RULE_ACTIONS,
  PRIORITIES, SOURCES, GENDERS, STATUS_OPTIONS, FOLLOWUP_TYPES,
  fieldOptions, OP_NEEDS_VALUE, FREEFORM_OPS,
} from '@/lib/rulesEngine'

// ── Dynamic context (single canvas = single rule = single target) ──
// Dropdown generators read this; the canvas sets it before load/inject.
let CTX = { target: 'lead', stages: [], tags: [], staff: [], customFields: [] }
export function setBlocklyContext(patch) { CTX = { ...CTX, ...patch } }
export function getBlocklyContext() { return CTX }

// ── Action block field definitions (also used by the serializer) ──
// kind → which Blockly field to render. Field `name` matches the action object key.
export const ACTION_DEFS = {
  set_stage:    { label: 'set stage to',        fields: [{ name: 'value', kind: 'stage' }] },
  set_priority: { label: 'set priority to',     fields: [{ name: 'value', kind: 'priority' }] },
  set_source:   { label: 'set source to',       fields: [{ name: 'value', kind: 'source' }] },
  set_status:   { label: 'set status to',       fields: [{ name: 'value', kind: 'status' }] },
  set_value:    { label: 'set deal value to',   fields: [{ name: 'value', kind: 'number' }] },
  add_tag:      { label: 'add tag',             fields: [{ name: 'value', kind: 'tag' }] },
  remove_tag:   { label: 'remove tag',          fields: [{ name: 'value', kind: 'tag' }] },
  assign_to:    { label: 'assign to',           fields: [{ name: 'value', kind: 'staff' }] },
  add_note:     { label: 'add note',            fields: [{ name: 'value', kind: 'text', ph: 'note text' }] },
  create_task:  { label: 'create task',         fields: [{ name: 'title', kind: 'text', ph: 'title' }, { name: 'priority', kind: 'priority' }, { name: 'dueInDays', kind: 'number', ph: 'in days' }] },
  schedule_followup: { label: 'schedule follow-up', fields: [{ name: 'fuType', kind: 'fu' }, { name: 'inDays', kind: 'number', ph: 'in days' }] },
  notify:       { label: 'send notification',   fields: [{ name: 'title', kind: 'text', ph: 'title' }, { name: 'message', kind: 'text', ph: 'message' }] },
}

const MATCH_OPTS = [['ALL (and)', 'all'], ['ANY (or)', 'any']]
const asOpts = (arr) => (arr && arr.length ? arr.map((v) => [String(v), String(v)]) : [['—', '']])

// ── Dropdown option generators (read CTX at open time) ──
function targetOptions() { return RULE_TARGETS.map((t) => [t.label, t.value]) }
function eventOptions() {
  const evs = RULE_EVENTS[CTX.target] || []
  return evs.length ? evs.map((e) => [e.label, e.value]) : [['—', '']]
}
function conditionFieldOptions() {
  const sys = (RULE_FIELDS[CTX.target] || []).map((f) => [f, f])
  const custom = (CTX.customFields || []).map((f) => [`${f.display} (custom)`, 'custom:' + f.api_name])
  const all = [...sys, ...custom]
  return all.length ? all : [['—', '']]
}
function actionOptionsFor(kind) {
  switch (kind) {
    case 'stage':    return asOpts(CTX.stages)
    case 'priority': return asOpts(PRIORITIES)
    case 'source':   return asOpts(SOURCES)
    case 'status':   return asOpts(STATUS_OPTIONS[CTX.target] || [])
    case 'fu':       return asOpts(FOLLOWUP_TYPES)
    case 'tag':      return (CTX.tags || []).length ? CTX.tags.map((t) => [t.name, t.id]) : [['(no tags)', '']]
    case 'staff':    return (CTX.staff || []).length ? CTX.staff.map((s) => [s.name, s.id]) : [['(no team)', '']]
    default:         return [['—', '']]
  }
}

// ── Block definitions ──────────────────────────────────────────
let DEFINED = false
export function defineRuleBlocks() {
  if (DEFINED || Blockly.Blocks['rule_when']) { DEFINED = true; return }
  DEFINED = true

  // WHEN hat — the root of every rule.
  Blockly.Blocks['rule_when'] = {
    init() {
      this.appendDummyInput()
        .appendField('WHEN')
        .appendField(new Blockly.FieldDropdown(targetOptions, function (v) {
          CTX = { ...CTX, target: v }
          const self = this.getSourceBlock()
          setTimeout(() => {
            const evs = RULE_EVENTS[v] || []
            if (!evs.find((e) => e.value === self.getFieldValue('EVENT'))) {
              try { self.setFieldValue(evs[0]?.value || '', 'EVENT') } catch {}
            }
          }, 0)
          return v
        }), 'TARGET')
        .appendField('▸')
        .appendField(new Blockly.FieldDropdown(eventOptions), 'EVENT')
      this.appendDummyInput()
        .appendField('match loose conditions')
        .appendField(new Blockly.FieldDropdown(MATCH_OPTS), 'MATCH')
      this.appendStatementInput('IF').setCheck('Condition').appendField('IF')
      this.appendStatementInput('DO').setCheck('Action').appendField('DO')
      this.setColour('#f59e0b')
      this.setDeletable(false)
      this.setMovable(true)
      this.setTooltip('When this event happens, check the IF conditions then run the DO actions.')
    },
  }

  // A single condition: field · op · value
  Blockly.Blocks['condition_compare'] = {
    init() {
      const rebuild = () => setTimeout(() => this.rebuildValue_(), 0)
      this.appendDummyInput('ROW')
        .appendField(new Blockly.FieldDropdown(conditionFieldOptions, (v) => { rebuild(); return v }), 'FIELD')
        .appendField(new Blockly.FieldDropdown(RULE_OPS.map((o) => [o.label, o.value]), (v) => { rebuild(); return v }), 'OP')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE')
      this.setPreviousStatement(true, 'Condition')
      this.setNextStatement(true, 'Condition')
      this.setColour('#7c3aed')
      this.setTooltip('A single condition. Empty checks need no value.')
    },
    // Swap the VALUE field between dropdown / text / none based on field + op.
    rebuildValue_() {
      if (this.isDisposed && this.isDisposed()) return
      const row = this.getInput('ROW')
      if (!row) return
      const op = this.getFieldValue('OP')
      const field = this.getFieldValue('FIELD')
      if (this.getField('VALUE')) {
        this._lastVal = this.getFieldValue('VALUE')
        try { row.removeField('VALUE') } catch {}
      }
      if (!OP_NEEDS_VALUE[op]) { this.render && this.render(); return }
      const opts = FREEFORM_OPS.has(op) ? null : fieldOptions(CTX.target, field, { stages: CTX.stages })
      let f
      if (opts && opts.length) {
        f = new Blockly.FieldDropdown([['Select…', ''], ...opts.map((o) => [String(o), String(o)])])
      } else {
        f = new Blockly.FieldTextInput(this._lastVal || '')
      }
      row.appendField(f, 'VALUE')
      if (this._lastVal != null) { try { this.setFieldValue(this._lastVal, 'VALUE') } catch {} }
      this.render && this.render()
    },
  }

  // A nested AND/OR group of conditions.
  Blockly.Blocks['condition_group'] = {
    init() {
      this.appendDummyInput()
        .appendField('group · match')
        .appendField(new Blockly.FieldDropdown(MATCH_OPTS), 'MATCH')
      this.appendStatementInput('CONDS').setCheck('Condition').appendField('of')
      this.setPreviousStatement(true, 'Condition')
      this.setNextStatement(true, 'Condition')
      this.setColour('#16a34a')
      this.setTooltip('A group of conditions combined with AND / OR.')
    },
  }

  // One block per action kind.
  for (const [type, def] of Object.entries(ACTION_DEFS)) {
    Blockly.Blocks['action_' + type] = {
      init() {
        const input = this.appendDummyInput().appendField(def.label)
        for (const f of def.fields) {
          if (f.kind === 'text' || f.kind === 'number') {
            input.appendField(new Blockly.FieldTextInput('', null), f.name)
          } else {
            input.appendField(new Blockly.FieldDropdown(() => actionOptionsFor(f.kind)), f.name)
          }
          if (f.ph) input.appendField(`(${f.ph})`)
        }
        this.setPreviousStatement(true, 'Action')
        this.setNextStatement(true, 'Action')
        this.setColour('#0ea5e9')
        this.setTooltip(def.label)
      },
    }
  }
}

// ── Toolbox (palette) for a given target ──
export function buildToolbox(target) {
  const actions = (RULE_ACTIONS[target] || []).map((a) => ({ kind: 'block', type: 'action_' + a.value }))
  return {
    kind: 'flyoutToolbox',
    contents: [
      { kind: 'label', text: 'Conditions' },
      { kind: 'block', type: 'condition_compare' },
      { kind: 'block', type: 'condition_group' },
      { kind: 'sep', gap: 12 },
      { kind: 'label', text: 'Actions' },
      ...actions,
    ],
  }
}

// ── Theme matching the app's WHEN/IF/THEN colour language ──
export function makeTheme() {
  return Blockly.Theme.defineTheme('hcrm', {
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#f8fafc',
      toolboxBackgroundColour: '#ffffff',
      toolboxForegroundColour: '#334155',
      flyoutBackgroundColour: '#f1f5f9',
      flyoutForegroundColour: '#334155',
      scrollbarColour: '#cbd5e1',
      insertionMarkerColour: '#6366f1',
      insertionMarkerOpacity: 0.4,
    },
    startHats: true,
  })
}
