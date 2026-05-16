import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClientDisc } from '../utils/disc'

export interface ForSaleListing {
  id: string
  disc_id: string
  disc_name: string
  disc_manufacturer: string
  disc_type: string
  disc_plastic: string
  disc_color: string
  disc_weight: string
  disc_condition: string
  status: 'available' | 'sold'
  listed_at: string
}

export function useForSale() {
  const { user } = useAuth()
  const [listings, setListings] = useState<ForSaleListing[]>([])
  const [saleToken, setSaleToken] = useState<string>('')
  const [saleIsPublic, setSaleIsPublic] = useState<boolean>(false)

  const loadListings = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('forsale_listings')
      .select('*')
      .order('listed_at', { ascending: false })
    setListings(
      (data || []).map(l => ({
        id: l.id,
        disc_id: l.disc_id || '',
        disc_name: l.disc_name || '',
        disc_manufacturer: l.disc_manufacturer || '',
        disc_type: l.disc_type || '',
        disc_plastic: l.disc_plastic || '',
        disc_color: l.disc_color || '',
        disc_weight: l.disc_weight || '',
        disc_condition: l.disc_condition || 'good',
        status: l.status === 'sold' ? 'sold' : 'available',
        listed_at: l.listed_at,
      }))
    )
  }, [user])

  const loadSaleToken = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('sale_tokens').select('*').eq('user_id', user.id).single()
    if (data) {
      setSaleToken(data.token || '')
      setSaleIsPublic(data.is_public ?? false)
    }
  }, [user])

  useEffect(() => {
    loadListings()
    loadSaleToken()
  }, [loadListings, loadSaleToken])

  const ensureSaleToken = async (): Promise<string> => {
    if (!user) return ''
    if (saleToken) return saleToken
    const newToken = crypto.randomUUID()
    await supabase.from('sale_tokens').upsert(
      { user_id: user.id, token: newToken, is_public: false },
      { onConflict: 'user_id' }
    )
    setSaleToken(newToken)
    return newToken
  }

  const addListing = async (disc: ClientDisc) => {
    if (!user) return
    await supabase.from('forsale_listings').insert({
      disc_id: disc.id,
      disc_name: disc.name,
      disc_manufacturer: disc.manufacturer,
      disc_type: disc.type,
      disc_plastic: disc.plastic,
      disc_color: disc.color,
      disc_weight: disc.weight,
      disc_condition: disc.condition,
      status: 'available',
    })
    await loadListings()
  }

  const deleteListing = async (id: string) => {
    await supabase.from('forsale_listings').delete().eq('id', id)
    await loadListings()
  }

  const updateStatus = async (id: string, status: 'available' | 'sold') => {
    await supabase.from('forsale_listings').update({ status }).eq('id', id)
    await loadListings()
  }

  const togglePublic = async () => {
    if (!user) return
    await ensureSaleToken()
    const newPublic = !saleIsPublic
    await supabase
      .from('sale_tokens')
      .update({ is_public: newPublic })
      .eq('user_id', user.id)
    setSaleIsPublic(newPublic)
  }

  const copyPublicLink = async () => {
    const token = await ensureSaleToken()
    const url = `https://proispro.com/sale.html?token=${token}`
    await navigator.clipboard.writeText(url)
  }

  const publicSaleUrl = saleToken ? `https://proispro.com/sale.html?token=${saleToken}` : ''

  const getDiscForListing = (listing: ForSaleListing, allDiscs: ClientDisc[]): ClientDisc | null => {
    const live = allDiscs.find(d => d.id === listing.disc_id)
    if (live) return live
    return {
      id: listing.disc_id,
      name: listing.disc_name,
      manufacturer: listing.disc_manufacturer,
      type: listing.disc_type,
      plastic: listing.disc_plastic,
      weight: listing.disc_weight,
      color: listing.disc_color,
      condition: listing.disc_condition,
      speed: '',
      glide: '',
      turn: '',
      fade: '',
      notes: '',
      tags: [],
      photo_url: null,
      added: 0,
      quantity: 1,
    }
  }

  return {
    listings,
    saleToken,
    saleIsPublic,
    publicSaleUrl,
    loadListings,
    loadSaleToken,
    ensureSaleToken,
    addListing,
    deleteListing,
    updateStatus,
    togglePublic,
    copyPublicLink,
    getDiscForListing,
  }
}
