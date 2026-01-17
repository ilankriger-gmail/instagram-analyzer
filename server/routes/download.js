// ========== ROTAS DE DOWNLOAD INSTAGRAM ==========

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const router = express.Router();

/**
 * Mapeia qualidade para formato yt-dlp
 */
function getFormatString(quality) {
  switch (quality) {
    case '1080':
      return 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
    case '720':
      return 'bestvideo[height<=720]+bestaudio/best[height<=720]';
    case '480':
      return 'bestvideo[height<=480]+bestaudio/best[height<=480]';
    case 'audio':
      return 'bestaudio';
    case 'best':
    default:
      return 'bestvideo+bestaudio/best';
  }
}

/**
 * GET /api/download
 * Baixa video do Instagram via yt-dlp
 *
 * Query params:
 *   - url: URL do Instagram
 *   - quality: 'best' | '1080' | '720' | '480' | 'audio'
 *   - filename: nome do arquivo (opcional)
 */
router.get('/download', async (req, res) => {
  const { url, quality = 'best', filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL e obrigatorio' });
  }

  console.log(`[Download] Iniciando: ${url} (quality: ${quality})`);

  // Cria arquivo temporario
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `ig_${Date.now()}.mp4`);
  const isAudio = quality === 'audio';
  const outputFile = isAudio ? tempFile.replace('.mp4', '.mp3') : tempFile;

  // Monta argumentos do yt-dlp
  const args = [
    '-f', getFormatString(quality),
    '--merge-output-format', isAudio ? 'mp3' : 'mp4',
    '-o', outputFile,
    '--no-playlist',
    '--no-warnings',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    url,
  ];

  // Se for audio, extrai apenas audio
  if (isAudio) {
    args.splice(2, 2, '-x', '--audio-format', 'mp3');
  }

  const ytdlp = spawn('yt-dlp', args);

  let stderr = '';

  ytdlp.stderr.on('data', (data) => {
    stderr += data.toString();
    console.log(`[yt-dlp] ${data.toString()}`);
  });

  ytdlp.stdout.on('data', (data) => {
    console.log(`[yt-dlp] ${data.toString()}`);
  });

  ytdlp.on('close', async (code) => {
    if (code !== 0) {
      console.error(`[Download] yt-dlp falhou: ${stderr}`);
      return res.status(500).json({
        error: 'Falha no download',
        details: stderr,
      });
    }

    // Verifica se arquivo existe
    if (!fs.existsSync(outputFile)) {
      console.error('[Download] Arquivo nao encontrado apos download');
      return res.status(500).json({
        error: 'Arquivo nao encontrado apos download',
      });
    }

    // Configura headers para download
    const finalFilename = filename || `instagram_${Date.now()}.${isAudio ? 'mp3' : 'mp4'}`;
    const contentType = isAudio ? 'audio/mpeg' : 'video/mp4';
    const stat = fs.statSync(outputFile);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);

    console.log(`[Download] Enviando arquivo: ${finalFilename} (${stat.size} bytes)`);

    // Stream do arquivo para o cliente
    const stream = fs.createReadStream(outputFile);

    stream.on('end', () => {
      // Limpa arquivo temporario
      fs.unlink(outputFile, (err) => {
        if (err) console.error('[Download] Erro ao limpar temp:', err);
      });
      console.log('[Download] Concluido');
    });

    stream.on('error', (err) => {
      console.error('[Download] Erro no stream:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
      fs.unlink(outputFile, () => {});
    });

    stream.pipe(res);
  });

  ytdlp.on('error', (err) => {
    console.error('[Download] Erro ao executar yt-dlp:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao executar yt-dlp',
        details: err.message,
      });
    }
  });
});

/**
 * GET /api/download/info
 * Retorna informacoes de formato disponiveis para um video
 */
router.get('/download/info', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL e obrigatorio' });
  }

  const ytdlp = spawn('yt-dlp', [
    '-J',
    '--no-warnings',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    url,
  ]);

  let stdout = '';
  let stderr = '';

  ytdlp.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  ytdlp.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  ytdlp.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: 'Falha ao obter informacoes',
        details: stderr,
      });
    }

    try {
      const info = JSON.parse(stdout);
      res.json({
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        formats: info.formats?.map(f => ({
          format_id: f.format_id,
          ext: f.ext,
          resolution: f.resolution,
          filesize: f.filesize,
        })),
      });
    } catch (e) {
      res.status(500).json({
        error: 'Erro ao parsear informacoes',
        details: e.message,
      });
    }
  });
});

module.exports = router;
