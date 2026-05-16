import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface WishlistItem {
  id: string
  disc_name: string
  manufacturer: string
  plastic_pref: string
  weight_min: number | null
  weight_max: number | null
  priority: number
  notes: string
  acquired: boolean
  created_at: string
}

export function useWishlist() {
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])

  const loadWishlist = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('wishlist_items')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    setItems(
      (data || []).map(w => ({
        id: w.id,
        disc_name: w.disc_name || '',
        manufacturer: w.manufacturer || '',
        plastic_pref: w.plastic_pref || '',
        weight_min: w.weight_min,
        weight_max: w.weight_max,
        priority: w.priority ?? 0,
        notes: w.notes || '',
        acquired: w.acquired ?? false,
        created_at: w.created_at,
      }))
    )
  }, [user])

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  const addItem = async (item: Omit<WishlistItem, 'id' | 'created_at' | 'acquired'>) => {
    if (!user) return
    await supabase.from('wishlist_items').insert({
      disc_name: item.disc_name,
      manufacturer: item.manufacturer,
      plastic_pref: item.plastic_pref,
      weight_min: item.weight_min,
      weight_max: item.weight_max,
      priority: item.priority,
      notes: item.notes,
      acquired: false,
    })
    await loadWishlist()
  }

  const updateItem = async (id: string, updates: Partial<WishlistItem>) => {
    await supabase.from('wishlist_items').update(updates).eq('id', id)
    await loadWishlist()
  }

  const deleteItem = async (id: string) => {
    await supabase.from('wishlist_items').delete().eq('id', id)
    await loadWishlist()
  }

  const toggleAcquired = async (id: string, acquired: boolean) => {
    await supabase.from('wishlist_items').update({ acquired }).eq('id', id)
    await loadWishlist()
  }

  return {
    items,
    loadWishlist,
    addItem,
    updateItem,
    deleteItem,
    toggleAcquired,
  }
}
