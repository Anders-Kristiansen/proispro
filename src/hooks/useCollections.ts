import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClientDisc } from '../utils/disc'

export interface ClientCollection {
  id: string
  name: string
  description: string
}

export interface CollectionDisc {
  collection_id: string
  disc_id: string
}

export function useCollections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState<ClientCollection[]>([])
  const [collectionDiscs, setCollectionDiscs] = useState<CollectionDisc[]>([])

  const loadCollections = useCallback(async () => {
    if (!user) return
    const { data: colData } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })
    setCollections(
      (colData || []).map(c => ({
        id: c.id,
        name: c.name || '',
        description: c.description || '',
      }))
    )

    const { data: cdData } = await supabase.from('collection_discs').select('collection_id, disc_id')
    setCollectionDiscs(
      (cdData || []).map(cd => ({
        collection_id: cd.collection_id,
        disc_id: cd.disc_id,
      }))
    )
  }, [user])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const createCollection = async (name: string, description: string) => {
    if (!user) return
    await supabase.from('collections').insert({ name, description })
    await loadCollections()
  }

  const updateCollection = async (id: string, name: string, description: string) => {
    await supabase.from('collections').update({ name, description }).eq('id', id)
    await loadCollections()
  }

  const deleteCollection = async (id: string) => {
    await supabase.from('collection_discs').delete().eq('collection_id', id)
    await supabase.from('collections').delete().eq('id', id)
    await loadCollections()
  }

  const toggleDiscInCollection = async (collectionId: string, discId: string) => {
    const existing = collectionDiscs.find(
      cd => cd.collection_id === collectionId && cd.disc_id === discId
    )
    if (existing) {
      await supabase
        .from('collection_discs')
        .delete()
        .eq('collection_id', collectionId)
        .eq('disc_id', discId)
    } else {
      await supabase.from('collection_discs').insert({ collection_id: collectionId, disc_id: discId })
    }
    await loadCollections()
  }

  const isDiscInCollection = (collectionId: string, discId: string): boolean => {
    return collectionDiscs.some(cd => cd.collection_id === collectionId && cd.disc_id === discId)
  }

  const getDiscsForCollection = (collection: ClientCollection, allDiscs: ClientDisc[]): ClientDisc[] => {
    const discIds = collectionDiscs
      .filter(cd => cd.collection_id === collection.id)
      .map(cd => cd.disc_id)
    return allDiscs.filter(d => discIds.includes(d.id))
  }

  return {
    collections,
    collectionDiscs,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    toggleDiscInCollection,
    isDiscInCollection,
    getDiscsForCollection,
  }
}
