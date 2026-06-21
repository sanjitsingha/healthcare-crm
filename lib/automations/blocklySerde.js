// Bidirectional mapping between the canonical rule JSON (what the engine runs)
// and a Blockly workspace. CLIENT-ONLY (imports blockly).
import * as Blockly from 'blockly'
import { ACTION_DEFS } from '@/lib/automations/blocklyConfig'

// ── Rule JSON → Blockly serialization state, then load ──
function linkChain(nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = { block: nodes[i + 1] }
  return nodes[0]
}

function compareNode(c) {
  return {
    type: 'condition_compare',
    fields: { FIELD: c.field || '', OP: c.op || '==', VALUE: String(c.value ?? '') },
  }
}

function groupNode(g) {
  const inner = (g.conditions || []).map(compareNode)
  const node = { type: 'condition_group', fields: { MATCH: g.match || 'all' } }
  if (inner.length) node.inputs = { CONDS: { block: linkChain(inner) } }
  return node
}

function actionNode(a) {
  // If / Else control-flow block (nested conditions + then/else action stacks).
  if (a.type === 'if') {
    const node = { type: 'action_if', fields: { MATCH: a.match || 'all' }, inputs: {} }
    const conds = (a.conditions || []).map(compareNode)
    const thenA = (a.then || []).map(actionNode).filter(Boolean)
    const elseA = (a.else || []).map(actionNode).filter(Boolean)
    if (conds.length) node.inputs.COND = { block: linkChain(conds) }
    if (thenA.length) node.inputs.THEN = { block: linkChain(thenA) }
    if (elseA.length) node.inputs.ELSE = { block: linkChain(elseA) }
    return node
  }
  const def = ACTION_DEFS[a.type]
  if (!def) return null
  const fields = {}
  for (const f of def.fields) fields[f.name] = String(a[f.name] ?? '')
  return { type: 'action_' + a.type, fields }
}

export function ruleToState(rule) {
  const ifNodes = [
    ...(rule.conditions || []).map(compareNode),
    ...(rule.condition_groups || []).map(groupNode),
  ]
  const doNodes = (rule.actions || []).map(actionNode).filter(Boolean)

  const when = {
    type: 'rule_when',
    deletable: false,
    x: 24,
    y: 24,
    fields: {
      TARGET: rule.target || 'lead',
      EVENT: rule.event || '',
      MATCH: rule.condition_match || 'all',
    },
    inputs: {},
  }
  if (ifNodes.length) when.inputs.IF = { block: linkChain(ifNodes) }
  if (doNodes.length) when.inputs.DO = { block: linkChain(doNodes) }

  return { blocks: { languageVersion: 0, blocks: [when] } }
}

// Load a rule into the workspace. Caller must setBlocklyContext({ target, ... })
// first so dependent dropdowns (EVENT, field options) resolve correctly.
export function loadRuleIntoWorkspace(workspace, rule) {
  Blockly.serialization.workspaces.load(ruleToState(rule), workspace)
}

// ── Blockly workspace → rule JSON ──
function readCompare(b) {
  return {
    field: b.getFieldValue('FIELD') || '',
    op: b.getFieldValue('OP') || '==',
    value: b.getField('VALUE') ? (b.getFieldValue('VALUE') ?? '') : '',
  }
}

// Walk a statement stack from a block input, mapping each block to an action.
function readActionStack(block, inputName) {
  const out = []
  let a = block.getInputTargetBlock(inputName)
  while (a) {
    const act = readAction(a)
    if (act) out.push(act)
    a = a.getNextBlock()
  }
  return out
}

function readAction(b) {
  if (b.type === 'action_if') {
    const conditions = []
    let c = b.getInputTargetBlock('COND')
    while (c) {
      if (c.type === 'condition_compare') conditions.push(readCompare(c))
      c = c.getNextBlock()
    }
    return {
      type: 'if',
      match: b.getFieldValue('MATCH') || 'all',
      conditions,
      then: readActionStack(b, 'THEN'),
      else: readActionStack(b, 'ELSE'),
    }
  }
  const type = (b.type || '').replace(/^action_/, '')
  const def = ACTION_DEFS[type]
  if (!def) return null
  const act = { type }
  for (const f of def.fields) act[f.name] = b.getField(f.name) ? (b.getFieldValue(f.name) ?? '') : ''
  return act
}

export function workspaceToRule(workspace, base = {}) {
  const when = workspace.getBlocksByType('rule_when', false)[0]
  if (!when) return { ...base, conditions: [], condition_groups: [], actions: [] }

  const conditions = []
  const condition_groups = []
  let c = when.getInputTargetBlock('IF')
  while (c) {
    if (c.type === 'condition_compare') {
      conditions.push(readCompare(c))
    } else if (c.type === 'condition_group') {
      const inner = []
      let g = c.getInputTargetBlock('CONDS')
      while (g) {
        if (g.type === 'condition_compare') inner.push(readCompare(g))
        g = g.getNextBlock()
      }
      condition_groups.push({ id: c.id, match: c.getFieldValue('MATCH') || 'all', conditions: inner })
    }
    c = c.getNextBlock()
  }

  const actions = []
  let a = when.getInputTargetBlock('DO')
  while (a) {
    const act = readAction(a)
    if (act) actions.push(act)
    a = a.getNextBlock()
  }

  return {
    ...base,
    target: when.getFieldValue('TARGET'),
    event: when.getFieldValue('EVENT'),
    condition_match: when.getFieldValue('MATCH') || 'all',
    conditions,
    condition_groups,
    actions,
  }
}
