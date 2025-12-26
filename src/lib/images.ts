export function getPosterUrl(path?: string | null) {
  if (!path) return '/placeholder.png'
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) {
    return path
  }
  
  // If it starts with / and is a known local file, return as is
  if (path.startsWith('/') && (path === '/placeholder.png' || path.startsWith('/public/'))) {
    return path
  }
  
  // If it starts with / but is not a local file, it's a TMDB path, prepend the base URL
  if (path.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${path}`
  }
  
  // Otherwise, it's a TMDB path, prepend the base URL
  return `https://image.tmdb.org/t/p/w500/${path}`
}

export function getUserAvatar(imagePath?: string | null, discordId?: string | null) {
  // If user has an image, check if it's the old UnknownUser1024 URL and replace it
  if (imagePath && imagePath !== '/placeholder.png') {
    // Replace old Discord CDN UnknownUser1024 URL with our custom image
    if (imagePath.includes('UnknownUser1024') || imagePath.includes('1431052716796547072')) {
      return '/noprofilepicture.jpg'
    }
    return imagePath
  }
  
  // User has no profile picture - use custom no profile picture
  // (Discord users should always have an image URL, but if not, use our default)
  return '/noprofilepicture.jpg'
}


