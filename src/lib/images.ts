export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url) return ''

  const { width = 400, height, quality = 80 } = options

  const isSupabaseStorage = url.includes('/storage/v1/object/public/')

  if (!isSupabaseStorage) return url

  const separator = url.includes('?') ? '&' : '?'
  let params = `width=${width}&quality=${quality}`
  if (height) params += `&height=${height}`

  return `${url}${separator}${params}`
}
