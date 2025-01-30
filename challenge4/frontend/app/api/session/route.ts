import { REALTIME_MODEL, VOICE } from '@/lib/constants'

// Get an ephemeral session token from the /realtime/sessions endpoint
export async function GET() {
  try {
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: VOICE
      })
    })

    return new Response(r.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}
