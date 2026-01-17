// ========== ROTAS DE PERFIL INSTAGRAM ==========

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../services/database');

const router = express.Router();

// Perfil fixo
const FIXED_USERNAME = 'nextleveldj1';

/**
 * Executa script Python e retorna resultado
 */
function runPythonScript(args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../scripts/fetch_profile.py');
    // Usa Python do virtual environment
    const venvPython = path.join(__dirname, '../../venv/bin/python3');
    const python = spawn(venvPython, [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python exited with code ${code}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    python.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * GET /api/videos
 * Busca videos do banco de dados
 */
router.get('/videos', async (req, res) => {
  try {
    console.log('[Videos] Buscando videos do banco...');

    const videos = await db.getVideos();
    const lastUpdate = await db.getLastUpdate();

    console.log(`[Videos] Encontrados ${videos.length} videos no banco`);

    res.json({
      username: FIXED_USERNAME,
      videos,
      lastUpdate,
      fromCache: true
    });

  } catch (error) {
    console.error('[Videos] Erro:', error);
    res.status(500).json({
      error: 'Erro ao buscar videos',
      details: error.message,
    });
  }
});

/**
 * POST /api/refresh
 * Atualiza videos do Instagram e salva no banco
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log(`[Refresh] Atualizando videos de @${FIXED_USERNAME}...`);

    const result = await runPythonScript([FIXED_USERNAME, 'all', '100']);

    if (result.error) {
      console.log(`[Refresh] Erro: ${result.error}`);
      return res.status(400).json(result);
    }

    // Salva no banco
    console.log(`[Refresh] Salvando ${result.videos?.length || 0} videos no banco...`);
    await db.saveVideos(result.videos || []);

    // Busca dados atualizados
    const videos = await db.getVideos();
    const lastUpdate = await db.getLastUpdate();

    console.log(`[Refresh] Concluido! ${videos.length} videos salvos.`);

    res.json({
      username: FIXED_USERNAME,
      videos,
      lastUpdate,
      fromCache: false
    });

  } catch (error) {
    console.error('[Refresh] Erro:', error);
    res.status(500).json({
      error: 'Erro ao atualizar videos',
      details: error.message,
    });
  }
});

/**
 * GET /api/profile/:username (mantido para compatibilidade)
 */
router.get('/profile/:username', async (req, res) => {
  // Redireciona para endpoint fixo
  res.redirect('/api/videos');
});

/**
 * POST /api/validate-urls
 * Valida uma lista de URLs do Instagram
 */
router.post('/validate-urls', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls deve ser um array' });
    }

    console.log(`[Validate] Validando ${urls.length} URLs`);

    const instagramRegex = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
    const results = [];

    for (const url of urls) {
      const match = url.match(instagramRegex);

      if (!match) {
        results.push({
          url,
          valid: false,
          error: 'URL invalida',
        });
        continue;
      }

      const shortcode = match[1];

      try {
        const videoInfo = await runPythonScript([shortcode]);

        if (videoInfo.error) {
          results.push({
            url,
            shortcode,
            valid: false,
            error: videoInfo.error,
          });
        } else {
          results.push({
            url,
            shortcode,
            valid: true,
            video: videoInfo,
          });
        }
      } catch (e) {
        results.push({
          url,
          shortcode,
          valid: false,
          error: e.message,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Validate] ${results.filter(r => r.valid).length}/${urls.length} URLs validas`);
    res.json({ results });

  } catch (error) {
    console.error('[Validate] Erro:', error);
    res.status(500).json({
      error: 'Erro ao validar URLs',
      details: error.message,
    });
  }
});

module.exports = router;
