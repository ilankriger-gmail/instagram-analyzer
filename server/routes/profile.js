// ========== ROTAS DE PERFIL INSTAGRAM ==========

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

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
 * GET /api/profile/:username
 * Busca videos de um perfil do Instagram
 *
 * Query params:
 *   - type: 'posts' | 'reels' | 'all' (default: 'all')
 *   - limit: number (default: 100)
 */
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { type = 'all', limit = '100' } = req.query;

    console.log(`[Profile] Buscando perfil: @${username} (type: ${type}, limit: ${limit})`);

    const result = await runPythonScript([username, type, limit]);

    if (result.error) {
      console.log(`[Profile] Erro: ${result.error}`);
      return res.status(400).json(result);
    }

    console.log(`[Profile] Encontrados ${result.videos?.length || 0} videos`);
    res.json(result);

  } catch (error) {
    console.error('[Profile] Erro:', error);
    res.status(500).json({
      error: 'Erro ao buscar perfil',
      details: error.message,
    });
  }
});

/**
 * GET /api/media/:shortcode
 * Busca informacoes de um video especifico
 */
router.get('/media/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;

    console.log(`[Media] Buscando video: ${shortcode}`);

    const result = await runPythonScript([shortcode]);

    if (result.error) {
      console.log(`[Media] Erro: ${result.error}`);
      return res.status(400).json(result);
    }

    console.log(`[Media] Video encontrado: ${result.caption || 'Sem titulo'}`);
    res.json(result);

  } catch (error) {
    console.error('[Media] Erro:', error);
    res.status(500).json({
      error: 'Erro ao buscar video',
      details: error.message,
    });
  }
});

/**
 * POST /api/validate-urls
 * Valida uma lista de URLs do Instagram
 *
 * Body:
 *   - urls: string[] (lista de URLs)
 */
router.post('/validate-urls', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls deve ser um array' });
    }

    console.log(`[Validate] Validando ${urls.length} URLs`);

    // Regex para extrair shortcode de URLs do Instagram
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

      // Delay entre requests para evitar rate limiting
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
