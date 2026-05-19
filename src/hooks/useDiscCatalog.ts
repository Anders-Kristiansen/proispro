import { useEffect, useState } from 'react'

const DISCIT_API = 'https://discit-api.fly.dev/disc'
const CATALOG_KEY = 'proispro_disc_catalog'
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000

export type CatalogDiscType = 'putter' | 'midrange' | 'fairway' | 'distance'

export interface CatalogDisc {
  id: string
  name: string
  brand: string
  category: string
  type: CatalogDiscType
  speed: number
  glide: number
  turn: number
  fade: number
}

interface DiscItDisc {
  id?: string | number
  name?: string
  brand?: string
  category?: string
  speed?: number | string | null
  glide?: number | string | null
  turn?: number | string | null
  fade?: number | string | null
}

let catalogCache: CatalogDisc[] | null = null
let catalogPromise: Promise<CatalogDisc[]> | null = null

function categoryToType(category?: string): CatalogDiscType {
  const normalized = category?.toLowerCase() || ''
  if (normalized.includes('putter')) return 'putter'
  if (normalized.includes('midrange')) return 'midrange'
  if (normalized.includes('hybrid') || normalized.includes('control') || normalized.includes('fairway')) {
    return 'fairway'
  }
  return 'distance'
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeDisc(disc: DiscItDisc): CatalogDisc {
  return {
    id: String(disc.id ?? ''),
    name: disc.name || '',
    brand: disc.brand || '',
    category: disc.category || '',
    type: categoryToType(disc.category),
    speed: toNumber(disc.speed),
    glide: toNumber(disc.glide),
    turn: toNumber(disc.turn),
    fade: toNumber(disc.fade),
  }
}

function readCachedCatalog(): CatalogDisc[] | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CATALOG_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { data?: DiscItDisc[]; ts?: number }
    if (!Array.isArray(parsed.data) || typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts >= CATALOG_TTL_MS) return null

    return parsed.data.map(normalizeDisc)
  } catch {
    return null
  }
}

function writeCachedCatalog(data: CatalogDisc[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CATALOG_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // Ignore quota and storage errors.
  }
}

async function loadCatalog(): Promise<CatalogDisc[]> {
  if (catalogCache) return catalogCache

  const cachedCatalog = readCachedCatalog()
  if (cachedCatalog) {
    catalogCache = cachedCatalog
    return cachedCatalog
  }

  if (!catalogPromise) {
    catalogPromise = (async () => {
      const response = await fetch(DISCIT_API)
      if (!response.ok) {
        throw new Error(`DiscIt API error: ${response.status}`)
      }

      const payload = (await response.json()) as DiscItDisc[]
      if (!Array.isArray(payload)) {
        throw new Error('Invalid DiscIt catalog response')
      }

      const normalizedCatalog = payload.map(normalizeDisc)
      catalogCache = normalizedCatalog
      writeCachedCatalog(normalizedCatalog)
      return normalizedCatalog
    })().finally(() => {
      catalogPromise = null
    })
  }

  return catalogPromise
}

export function useDiscCatalog() {
  const [catalog, setCatalog] = useState<CatalogDisc[]>(() => catalogCache ?? [])
  const [isLoading, setIsLoading] = useState(() => !catalogCache)

  useEffect(() => {
    let isMounted = true

    if (catalogCache) {
      setCatalog(catalogCache)
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    setIsLoading(true)

    loadCatalog()
      .then(data => {
        if (isMounted) {
          setCatalog(data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCatalog([])
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { catalog, isLoading }
}
