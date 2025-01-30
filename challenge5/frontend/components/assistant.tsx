'use client'
import React from 'react'
import Chat from './chat'
import useConversationStore from '@/stores/useConversationStore'
import { Item, processMessages } from '@/lib/assistant'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const Assistant: React.FC = () => {
  const { chatMessages, addConversationItem, addChatMessage } =
    useConversationStore()

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return

    const userItem: Item = {
      type: 'message',
      role: 'user',
      content: message.trim()
    }
    const userMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: message.trim()
    }

    try {
      addConversationItem(userMessage)
      addChatMessage(userItem)

      await processMessages()
    } catch (error) {
      console.error('Error processing message:', error)
    }
  }

  return (
    <div className="h-full p-4 w-full rounded-t-2xl shadow-lg bg-gray-100">
      <Chat items={chatMessages} onSendMessage={handleSendMessage} />
    </div>
  )
}

export default Assistant
