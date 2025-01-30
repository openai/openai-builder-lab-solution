'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  REALTIME_BASE_URL,
  REALTIME_MODEL,
  REALTIME_PROMPT
} from '@/lib/constants'

export default function VoiceMode() {
  const [isSessionStarted, setIsSessionStarted] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null)
  const tracks = useRef<RTCRtpSender[] | null>(null)

  // Start a new realtime session
  async function startSession() {
    try {
      if (!isSessionStarted) {
        setIsSessionStarted(true)
        // Get an ephemeral session token
        const session = await fetch('/api/session').then(response =>
          response.json()
        )
        const sessionToken = session.client_secret.value
        const sessionId = session.id

        console.log('Session id:', sessionId)

        // Create a peer connection
        const pc = new RTCPeerConnection()

        // Set up to play remote audio from the model
        if (!audioElement.current) {
          audioElement.current = document.createElement('audio')
        }
        audioElement.current.autoplay = true
        pc.ontrack = e => {
          if (audioElement.current) {
            audioElement.current.srcObject = e.streams[0]
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        })

        stream.getTracks().forEach(track => {
          const sender = pc.addTrack(track, stream)
          if (sender) {
            tracks.current = [...(tracks.current || []), sender]
          }
        })

        // Set up data channel for sending and receiving events
        const dc = pc.createDataChannel('oai-events')
        setDataChannel(dc)

        // Start the session using the Session Description Protocol (SDP)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        const sdpResponse = await fetch(
          `${REALTIME_BASE_URL}?model=${REALTIME_MODEL}`,
          {
            method: 'POST',
            body: offer.sdp,
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              'Content-Type': 'application/sdp'
            }
          }
        )

        const answer: RTCSessionDescriptionInit = {
          type: 'answer',
          sdp: await sdpResponse.text()
        }
        await pc.setRemoteDescription(answer)

        peerConnection.current = pc
      }
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close()
    }
    if (peerConnection.current) {
      peerConnection.current.close()
    }

    setIsSessionStarted(false)
    setIsSessionActive(false)
    setDataChannel(null)
    peerConnection.current = null
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
    }
    setAudioStream(null)
    audioTransceiver.current = null
  }

  // Send a message to the model
  const sendClientEvent = useCallback(
    (message: any) => {
      if (dataChannel) {
        message.event_id = message.event_id || crypto.randomUUID()
        dataChannel.send(JSON.stringify(message))
      } else {
        console.error(
          'Failed to send message - no data channel available',
          message
        )
      }
    },
    [dataChannel]
  )

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener('message', e => {
        const event = JSON.parse(e.data)
        if (event.type === 'conversation.item.created') {
          //const output = event.response.output[0];
          const output = event
        }
      })

      // Set session active when the data channel is opened
      dataChannel.addEventListener('open', () => {
        setIsSessionActive(true)
        // Send session config
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: REALTIME_PROMPT
          }
        }
        sendClientEvent(sessionUpdate)
        console.log('Session update sent:', sessionUpdate)
      })
    }
  }, [dataChannel, sendClientEvent])

  const handleConnectClick = async () => {
    if (isSessionActive) {
      console.log('Stopping session.')
      stopSession()
    } else {
      console.log('Starting session.')
      startSession()
    }
  }

  return (
    <button
      className={`${
        isSessionActive ? 'animate-pulse' : ''
      } flex size-8 items-center justify-center rounded-full bg-black text-white transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:outline-black disabled:bg-[#D7D7D7] disabled:text-[#f4f4f4] disabled:hover:opacity-100`}
      onClick={() => {
        handleConnectClick()
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 10v3" />
        <path d="M6 6v11" />
        <path d="M10 3v18" />
        <path d="M14 8v7" />
        <path d="M18 5v13" />
        <path d="M22 10v3" />
      </svg>
    </button>
  )
}
