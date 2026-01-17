// ========== API SERVICE ==========

const API_BASE = '/api';

/**
 * Busca perfil do Instagram
 */
async function fetchProfile(username, type = 'all', limit = 100) {
  const response = await fetch(
    `${API_BASE}/profile/${encodeURIComponent(username)}?type=${type}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar perfil');
  }

  return response.json();
}

/**
 * Busca informacoes de um video
 */
async function fetchMedia(shortcode) {
  const response = await fetch(`${API_BASE}/media/${encodeURIComponent(shortcode)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar video');
  }

  return response.json();
}

/**
 * Valida lista de URLs do Instagram
 */
async function validateUrls(urls) {
  const response = await fetch(`${API_BASE}/validate-urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao validar URLs');
  }

  return response.json();
}

/**
 * Gera URL de download
 */
function getDownloadUrl(videoUrl, quality = 'best', filename = '') {
  const params = new URLSearchParams({
    url: videoUrl,
    quality,
  });

  if (filename) {
    params.append('filename', filename);
  }

  return `${API_BASE}/download?${params.toString()}`;
}

/**
 * Extrai shortcode de URL do Instagram
 */
function extractShortcode(url) {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Formata numero com sufixo (K, M)
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Formata duracao em segundos para mm:ss
 */
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Gera nome de arquivo para download
 */
function generateFilename(video) {
  const viewsFormatted = formatNumber(video.views);
  let title = video.caption || 'video';

  // Limpa titulo
  title = title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50);

  return `IG - ${viewsFormatted} - ${title}.mp4`;
}
