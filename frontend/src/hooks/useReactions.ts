import { useState, useCallback, useRef } from 'react'
import { ReactionPayload } from '../types'

const REACTION_LIFETIME = 3000  // ms
const MAX_REACTIONS     = 20    // concurrent max

interface ActiveReaction extends ReactionPayload {
  id:   string
  x:    number    // % from left
  y:    number    // fixed bottom offset in px
}

let reactionIdCounter = 0

export function useReactions() {
  const [reactions, setReactions] = useState<ActiveReaction[]>([])
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addReaction = useCallback((payload: ReactionPayload) => {
    const id = `r_${++reactionIdCounter}`

    const active: ActiveReaction = {
      ...payload,
      id,
      x: 10 + Math.random() * 70,  // 10%–80% from left
      y: 80 + Math.random() * 40,  // px from bottom
    }

    setReactions((prev) => {
      const next = [...prev, active]
      // Cap to MAX_REACTIONS
      return next.length > MAX_REACTIONS ? next.slice(next.length - MAX_REACTIONS) : next
    })

    const timer = setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id))
      timerMap.current.delete(id)
    }, REACTION_LIFETIME)

    timerMap.current.set(id, timer)
  }, [])

  const clearAll = useCallback(() => {
    timerMap.current.forEach((t) => clearTimeout(t))
    timerMap.current.clear()
    setReactions([])
  }, [])

  return { reactions, addReaction, clearAll }
}
