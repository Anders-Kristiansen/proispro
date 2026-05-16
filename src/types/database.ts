// Auto-generated types stub — run `npx supabase gen types typescript --project-id odqhusmmqgipvazusrxs` to regenerate

export type DiscType = 'distance_driver' | 'fairway_driver' | 'midrange' | 'putter'
export type DiscCondition = 'new' | 'good' | 'worn' | 'beat-in'

export interface Disc {
  id: string
  name: string
  manufacturer: string | null
  type: DiscType | null
  plastic: string | null
  weight: number | null
  color: string | null
  condition: DiscCondition
  speed: number | null
  glide: number | null
  turn: number | null
  fade: number | null
  notes: string | null
  tags: string[]
  quantity: number
  photo_url: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface Bag {
  id: string
  name: string
  disc_ids: string[]
  created_at: string
  updated_at: string
  user_id: string
}

export interface CoursePin {
  id: string
  course_id: string
  course_name: string
  bag_id: string | null
  holes_data: unknown | null
  created_at: string
  user_id: string
}

export interface HoleAssignment {
  id: string
  course_pin_id: string
  hole_ref: string
  disc_id: string
  assigned_at: string
  user_id: string
}
