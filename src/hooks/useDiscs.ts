import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClientDisc, fromDbDisc, toDbDisc } from '../utils/disc'

export function useDiscs() {
  const { user } = useAuth()
  const [discs, setDiscs] = useState<ClientDisc[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDiscs = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('discs')
        .select('*')
        .order('added_at', { ascending: false })
      if (error) throw error
      setDiscs((data || []).map(fromDbDisc))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discs')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadDiscs()
  }, [loadDiscs])

  const saveDisc = async (
    disc: Omit<ClientDisc, 'id'> & { id?: string }
  ): Promise<ClientDisc | null> => {
    if (!user) return null
    try {
      if (disc.id) {
        // Update
        const { error } = await supabase
          .from('discs')
          .update(toDbDisc(disc as ClientDisc))
          .eq('id', disc.id)
        if (error) throw error
        const updated = disc as ClientDisc
        setDiscs(prev => prev.map(d => (d.id === disc.id ? updated : d)))
        return updated
      } else {
        // Insert
        const newId = crypto.randomUUID()
        const newDisc = { ...disc, id: newId, added: Date.now() } as ClientDisc
        const { data, error } = await supabase
          .from('discs')
          .insert([{ ...toDbDisc(newDisc), user_id: user.id }])
          .select()
          .single()
        if (error) throw new Error(error.message)
        const saved = fromDbDisc(data)
        setDiscs(prev => [saved, ...prev])
        return saved
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  const deleteDisc = async (id: string) => {
    const { error } = await supabase.from('discs').delete().eq('id', id)
    if (error) throw error
    setDiscs(prev => prev.filter(d => d.id !== id))
  }

  const setDiscQty = async (id: string, qty: number) => {
    const safeQty = Math.max(1, qty)
    setDiscs(prev => prev.map(d => (d.id === id ? { ...d, quantity: safeQty } : d)))
    const { error } = await supabase.from('discs').update({ quantity: safeQty }).eq('id', id)
    if (error) {
      // Revert optimistic update
      setDiscs(prev => prev.map(d => (d.id === id ? { ...d, quantity: d.quantity } : d)))
      throw error
    }
  }

  return { discs, isLoading, error, loadDiscs, saveDisc, deleteDisc, setDiscQty }
}
