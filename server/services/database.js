// ========== DATABASE SERVICE ==========

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Busca todos os videos do banco
 */
async function getVideos() {
  const result = await pool.query(
    'SELECT * FROM instagram_videos ORDER BY views DESC'
  );
  return result.rows;
}

/**
 * Salva ou atualiza um video
 */
async function upsertVideo(video) {
  const query = `
    INSERT INTO instagram_videos (
      shortcode, thumbnail, caption, caption_full, views, likes,
      comments, duration, timestamp, type, url, video_url, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (shortcode)
    DO UPDATE SET
      thumbnail = EXCLUDED.thumbnail,
      caption = EXCLUDED.caption,
      caption_full = EXCLUDED.caption_full,
      views = EXCLUDED.views,
      likes = EXCLUDED.likes,
      comments = EXCLUDED.comments,
      duration = EXCLUDED.duration,
      timestamp = EXCLUDED.timestamp,
      type = EXCLUDED.type,
      url = EXCLUDED.url,
      video_url = EXCLUDED.video_url,
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    video.shortcode,
    video.thumbnail,
    video.caption,
    video.caption_full,
    video.views || 0,
    video.likes || 0,
    video.comments || 0,
    Math.round(video.duration || 0),  // Converte para inteiro
    video.timestamp,
    video.type,
    video.url,
    video.video_url
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Salva multiplos videos
 */
async function saveVideos(videos) {
  const saved = [];
  for (const video of videos) {
    const result = await upsertVideo(video);
    saved.push(result);
  }
  return saved;
}

/**
 * Limpa todos os videos
 */
async function clearVideos() {
  await pool.query('DELETE FROM instagram_videos');
}

/**
 * Busca ultima atualizacao
 */
async function getLastUpdate() {
  const result = await pool.query(
    'SELECT MAX(updated_at) as last_update FROM instagram_videos'
  );
  return result.rows[0]?.last_update;
}

module.exports = {
  pool,
  getVideos,
  upsertVideo,
  saveVideos,
  clearVideos,
  getLastUpdate
};
