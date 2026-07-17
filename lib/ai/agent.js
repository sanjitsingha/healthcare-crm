// SERVER-ONLY. The tool-calling loop. This is the single seam every consumer
// (the Zeo panel today) plugs into. v1 is read-only: all tools auto-execute
// within one request, so there is no confirmation/pause path yet.
import { chatCompletion } from './providers'
import { TOOL_SCHEMAS, runTool } from './tools'
import { buildSystemPrompt } from './prompt'

const MAX_STEPS = 5          // tool round-trips before we stop
const MAX_TURNS = 20         // recent transcript turns fed to the model

/**
 * @param {object}   p
 * @param {object}   p.config    { provider, model, apiKey, systemPrompt }
 * @param {string}   p.orgId
 * @param {string}   p.orgName
 * @param {object}   p.db        service-role Supabase client (for tools)
 * @param {Array}    p.messages  [{ role:'user'|'assistant', content }]
 * @returns {Promise<{ reply: string }>}
 */
export async function runAgent({ config, orgId, orgName, db, messages }) {
  const recent = (messages || []).slice(-MAX_TURNS)
  const convo = [
    { role: 'system', content: buildSystemPrompt({ orgName, userPrompt: config.systemPrompt }) },
    ...recent.map((m) => ({ role: m.role, content: m.content })),
  ]

  for (let step = 0; step < MAX_STEPS; step++) {
    const message = await chatCompletion({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      messages: convo,
      tools: TOOL_SCHEMAS,
    })

    const toolCalls = message.tool_calls || []
    if (!toolCalls.length) {
      return { reply: (message.content || '').trim() || "I couldn't find an answer to that." }
    }

    // Record the assistant's tool-call turn, then run each tool and append results.
    convo.push({ role: 'assistant', content: message.content || '', tool_calls: toolCalls })

    for (const tc of toolCalls) {
      let args = {}
      try {
        args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        args = {}
      }
      const result = await runTool(tc.function?.name, args, { db, orgId })
      convo.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }
  }

  // Ran out of steps — ask the model for a final answer with no more tools.
  const final = await chatCompletion({
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    messages: [
      ...convo,
      { role: 'user', content: 'Please give your best final answer now using the information gathered above. Do not call any more tools.' },
    ],
  })
  return { reply: (final.content || '').trim() || "I gathered some data but couldn't compose a final answer." }
}
