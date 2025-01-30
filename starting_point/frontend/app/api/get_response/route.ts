export async function POST(request: Request) {
  const { messages } = await request.json()

  console.log('Incoming messages', messages)

  try {
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2s wait
    return new Response(
      JSON.stringify({
        role: 'assistant',
        content:
          'This is a default message, update the backend to get a response from the OpenAI API instead.'
      })
    )
  } catch (error: any) {
    console.error('Error in POST handler:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}
