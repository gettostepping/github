export function isAnimeContent(tmdbData: any): boolean {
  if (!tmdbData) return false
  if (tmdbData.media_type === 'anime') return true
  if (tmdbData.aniwatch_id || tmdbData.anilist_id) return true
  const genres = tmdbData.genres || []
  return genres.some((genre: any) => {
    const name = typeof genre === 'string' ? genre : genre?.name
    return name && /anime|animation/i.test(name)
  })
}

