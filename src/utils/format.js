export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getRoomCode(room) {
  return room?.code || room?.room_code || room?.id || '-'
}

export function getMovieTitle(movie) {
  return movie?.title || movie?.name || 'Untitled movie'
}
