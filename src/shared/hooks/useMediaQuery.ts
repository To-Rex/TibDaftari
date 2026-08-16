import { useEffect, useState } from 'react'
export function useMediaQuery(query: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = () => setM(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return m
}
