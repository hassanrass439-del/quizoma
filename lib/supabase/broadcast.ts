/**
 * Broadcast an event via Supabase Realtime REST API.
 * Beaucoup plus rapide que subscribe/send/unsubscribe (~100ms vs ~2-5s).
 */
export async function serverBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: channelName,
          event,
          payload,
        },
      ],
    }),
  })

  if (!res.ok) {
    console.error('[broadcast] error:', res.status, await res.text().catch(() => ''))
  }
}
