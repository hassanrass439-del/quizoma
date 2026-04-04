import { createClient } from '@/lib/supabase/server'

/**
 * Broadcast an event to a Supabase Realtime channel from the server.
 * Subscribes first (required), sends, then cleans up.
 * Includes a 5s timeout to avoid hanging if Realtime is slow.
 */
export async function serverBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  const channel = supabase.channel(channelName)

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5000)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout)
        resolve()
      }
    })
  })

  await channel.send({ type: 'broadcast', event, payload })
  await supabase.removeChannel(channel)
}
