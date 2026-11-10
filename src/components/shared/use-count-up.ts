'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

/** Animasi angka naik (count-up) saat nilai berubah */
export function useCountUp(target: number, duration = 0.7): number {
  const [val, setVal] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    const from = prev.current
    if (from === target) return
    const controls = animate(from, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(v),
    })
    prev.current = target
    return () => controls.stop()
  }, [target, duration])

  return Math.round(val)
}
