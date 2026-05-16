import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClientBag } from '../utils/disc'

export function useBags() {
  const { user } = useAuth()
  const [bags, setBags] = useState<ClientBag[]>([])

  const loadBags = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('bags').select('id, name, disc_ids')
    setBags(
      (data || []).map(b => ({
        id: b.id,
        name: b.name || '',
        disc_ids: Array.isArray(b.disc_ids) ? b.disc_ids : [],
      }))
    )
  }, [user])

  useEffect(() => {
    loadBags()
  }, [loadBags])

  const toggleDiscInBag = async (bagId: string, discId: string) => {
    const bag = bags.find(b => b.id === bagId)
    if (!bag) return
    const alreadyIn = bag.disc_ids.includes(discId)
    const newIds = alreadyIn
      ? bag.disc_ids.filter(id => id !== discId)
      : [...bag.disc_ids, discId]
    setBags(prev => prev.map(b => (b.id === bagId ? { ...b, disc_ids: newIds } : b)))
    await supabase.from('bags').update({ disc_ids: newIds }).eq('id', bagId)
  }

  return { bags, toggleDiscInBag }
}
