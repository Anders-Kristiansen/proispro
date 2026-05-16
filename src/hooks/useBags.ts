import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClientBag, ClientDisc } from '../utils/disc'

interface BagHistoryEntry {
  id: string
  bag_id: string
  disc_id: string
  disc_name: string
  action: 'added' | 'removed'
  changed_at: string
}

export function formatHistoryTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(ts).toLocaleDateString()
}

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

  const recordHistory = async (
    bagId: string,
    discId: string,
    discName: string,
    action: 'added' | 'removed'
  ) => {
    try {
      await supabase.from('bag_history').insert({
        bag_id: bagId,
        disc_id: discId,
        disc_name: discName,
        action,
        user_id: user?.id,
      })
    } catch (err) {
      // Non-critical, swallow errors
    }
  }

  const createBag = async (name: string) => {
    if (!user) return
    const newBag: ClientBag = {
      id: crypto.randomUUID(),
      name,
      disc_ids: [],
    }
    setBags(prev => [...prev, newBag])
    await supabase.from('bags').insert({
      id: newBag.id,
      name: newBag.name,
      disc_ids: [],
      user_id: user.id,
    })
  }

  const renameBag = async (id: string, name: string) => {
    setBags(prev => prev.map(b => (b.id === id ? { ...b, name } : b)))
    await supabase.from('bags').update({ name }).eq('id', id)
  }

  const deleteBag = async (id: string) => {
    setBags(prev => prev.filter(b => b.id !== id))
    await supabase.from('bags').delete().eq('id', id)
  }

  const toggleDiscInBag = async (
    bagId: string,
    discId: string,
    discs: ClientDisc[]
  ) => {
    const bag = bags.find(b => b.id === bagId)
    if (!bag) return
    const disc = discs.find(d => d.id === discId)
    const discName = disc?.name || 'Unknown'
    const alreadyIn = bag.disc_ids.includes(discId)
    const newIds = alreadyIn
      ? bag.disc_ids.filter(id => id !== discId)
      : [...bag.disc_ids, discId]
    setBags(prev => prev.map(b => (b.id === bagId ? { ...b, disc_ids: newIds } : b)))
    await supabase.from('bags').update({ disc_ids: newIds }).eq('id', bagId)
    await recordHistory(bagId, discId, discName, alreadyIn ? 'removed' : 'added')
  }

  const removeDiscFromBag = async (bagId: string, discId: string, discName: string) => {
    const bag = bags.find(b => b.id === bagId)
    if (!bag) return
    const newIds = bag.disc_ids.filter(id => id !== discId)
    setBags(prev => prev.map(b => (b.id === bagId ? { ...b, disc_ids: newIds } : b)))
    await supabase.from('bags').update({ disc_ids: newIds }).eq('id', bagId)
    await recordHistory(bagId, discId, discName, 'removed')
  }

  const loadBagHistory = async (bagId: string): Promise<BagHistoryEntry[]> => {
    const { data } = await supabase
      .from('bag_history')
      .select('*')
      .eq('bag_id', bagId)
      .order('changed_at', { ascending: false })
      .limit(20)
    return (data || []) as BagHistoryEntry[]
  }

  return {
    bags,
    createBag,
    renameBag,
    deleteBag,
    toggleDiscInBag,
    removeDiscFromBag,
    loadBagHistory,
  }
}
