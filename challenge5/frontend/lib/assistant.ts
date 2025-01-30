import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT } from '@/lib/constants'
import { parse } from 'partial-json'
import { handleTool } from './tools'
import useConversationStore from '@/stores/useConversationStore'

export interface MessageItem {
  type: 'message'
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface FunctionCallItem {
  type: 'function_call'
  status: 'in_progress' | 'completed' | 'failed'
  id: string
  name: string
  arguments: string
  parsedArguments: any
  output: string | null
}

export type Item = MessageItem | FunctionCallItem

export const handleTurn = async (
  messages: ChatCompletionMessageParam[],
  onMessage: (data: any) => void
) => {
  console.log('Handle turn', messages)
  try {
    // To use the python backend, replace by
    //const response = await fetch('http://localhost:8000/get_response', {
    const response = await fetch('/api/get_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    })

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let done = false
    let buffer = ''

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      const chunkValue = decoder.decode(value)
      buffer += chunkValue

      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') {
            done = true
            break
          }
          const data = JSON.parse(dataStr)
          onMessage(data)
        }
      }
    }

    // Handle any remaining data in buffer
    if (buffer && buffer.startsWith('data: ')) {
      const dataStr = buffer.slice(6)
      if (dataStr !== '[DONE]') {
        const data = JSON.parse(dataStr)
        onMessage(data)
      }
    }
  } catch (error) {
    console.error('Error handling turn:', error)
  }
}

export const processMessages = async () => {
  const {
    chatMessages,
    conversationItems,
    setChatMessages,
    setConversationItems
  } = useConversationStore.getState()

  const allConversationItems: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    ...conversationItems
  ]

  let assistantMessageContent = ''
  let functionArguments = ''

  await handleTurn(allConversationItems, async ({ event, data }) => {
    // Handle message from the assistant
    if (event === 'assistant_delta') {
      assistantMessageContent += data.content || ''

      // Update chat messages
      const lastItemIndex = chatMessages.length - 1
      if (
        chatMessages[lastItemIndex] &&
        chatMessages[lastItemIndex].type === 'message' &&
        chatMessages[lastItemIndex].role === 'assistant'
      ) {
        chatMessages[lastItemIndex].content = assistantMessageContent
      } else {
        chatMessages.push({
          type: 'message',
          role: 'assistant',
          content: assistantMessageContent
        })
      }
      setChatMessages([...chatMessages])

      // Update conversation items
      const lastMessageIndex = conversationItems.length - 1
      if (
        conversationItems[lastMessageIndex] &&
        conversationItems[lastMessageIndex].role === 'assistant'
      ) {
        conversationItems[lastMessageIndex].content = assistantMessageContent
      } else {
        conversationItems.push({
          role: 'assistant',
          content: assistantMessageContent
        })
      }
      setConversationItems([...conversationItems])
    }
    // Handle streaming tool call
    else if (event === 'function_arguments_delta') {
      functionArguments += data.arguments || ''
      let parsedFunctionArguments = {}
      if (functionArguments.length > 0) {
        parsedFunctionArguments = parse(functionArguments)
      }

      // Update chat messages
      const lastItemIndex = chatMessages.length - 1
      if (
        chatMessages[lastItemIndex] &&
        chatMessages[lastItemIndex].type === 'function_call' &&
        chatMessages[lastItemIndex].id === data.callId
      ) {
        chatMessages[lastItemIndex].arguments = functionArguments
        chatMessages[lastItemIndex].parsedArguments = parsedFunctionArguments
      } else {
        chatMessages.push({
          type: 'function_call',
          status: 'in_progress',
          id: data.callId,
          name: data.name,
          arguments: functionArguments,
          parsedArguments: parsedFunctionArguments,
          output: null
        })
      }
      setChatMessages([...chatMessages])

      // Update conversation items
      const lastMessageIndex = conversationItems.length - 1
      if (
        conversationItems[lastMessageIndex] &&
        conversationItems[lastMessageIndex].role === 'assistant'
      ) {
        if (conversationItems[lastMessageIndex].tool_calls) {
          conversationItems[lastMessageIndex].tool_calls[0].function.arguments =
            functionArguments
        } else {
          conversationItems[lastMessageIndex].tool_calls = [
            {
              id: data.callId,
              type: 'function',
              function: {
                arguments: functionArguments,
                name: data.name
              }
            }
          ]
        }
      } else {
        conversationItems.push({
          role: 'assistant',
          tool_calls: [
            {
              id: data.callId,
              type: 'function',
              function: {
                arguments: functionArguments,
                name: data.name
              }
            }
          ]
        })
      }
      setConversationItems([...conversationItems])
    }

    // Handle tool call execution
    else if (event === 'function_arguments_done') {
      // Get tool call result
      const toolCallResult = await handleTool(
        data.name,
        parse(functionArguments)
      )

      // Update chat messages
      const lastItemIndex = chatMessages.length - 1
      if (
        chatMessages[lastItemIndex] &&
        chatMessages[lastItemIndex].type === 'function_call'
      ) {
        chatMessages[lastItemIndex].status = 'completed'
        chatMessages[lastItemIndex].output = JSON.stringify(toolCallResult)
      }

      setChatMessages([...chatMessages])

      // Update conversation items
      conversationItems.push({
        role: 'tool',
        tool_call_id: data.callId,
        content: JSON.stringify(toolCallResult)
      })

      setConversationItems([...conversationItems])

      await processMessages()
    }
  })
}
