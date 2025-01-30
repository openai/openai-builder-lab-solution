import OpenAI from 'openai'
import { tools } from '@/lib/tools'
import { ChatCompletionTool } from 'openai/resources/chat/completions.mjs'
const openai = new OpenAI()

const MODEL = 'gpt-4o'

export async function POST(request: Request) {
  const { messages } = await request.json()

  console.log('Incoming messages', messages)

  try {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting OpenAI stream', messages[messages.length - 1])
          const openaiStream = openai.beta.chat.completions.stream({
            model: MODEL,
            messages,
            tools: tools as ChatCompletionTool[]
          })

          let functionArguments = ''
          let callId = ''
          let functionName = ''
          let isCollectingFunctionArgs = false

          for await (const part of openaiStream) {
            const delta = part.choices[0].delta
            const finishReason = part.choices[0].finish_reason

            if (delta.content) {
              const data = JSON.stringify({
                event: 'assistant_delta',
                data: delta
              })
              controller.enqueue(`data: ${data}\n\n`)
            }

            if (delta.tool_calls) {
              isCollectingFunctionArgs = true
              if (delta.tool_calls[0].id) {
                callId = delta.tool_calls[0].id
              }
              if (delta.tool_calls[0].function?.name) {
                functionName = delta.tool_calls[0].function.name
                console.log('Function execution:', functionName)
              }
              functionArguments += delta.tool_calls[0].function?.arguments || ''

              const data = JSON.stringify({
                event: 'function_arguments_delta',
                data: {
                  callId: callId,
                  name: functionName,
                  arguments: delta.tool_calls[0].function?.arguments
                }
              })
              controller.enqueue(`data: ${data}\n\n`)
            }

            if (finishReason === 'tool_calls' && isCollectingFunctionArgs) {
              console.log(`tool call ${functionName} is complete`)
              const data = JSON.stringify({
                event: 'function_arguments_done',
                data: {
                  callId: callId,
                  name: functionName,
                  arguments: functionArguments
                }
              })
              controller.enqueue(`data: ${data}\n\n`)

              // Reset function arguments
              functionArguments = ''
              functionName = ''
              isCollectingFunctionArgs = false
            }
          }

          controller.close()
        } catch (error) {
          console.error('Error in stream start:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  } catch (error: any) {
    console.error('Error in POST handler:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}
