// ========== DOWNLOAD MODULE ==========

const Download = {
  queue: [],
  currentIndex: -1,
  isRunning: false,
  aborted: false,

  /**
   * Inicia downloads
   */
  async start(videos, quality = 'best') {
    if (videos.length === 0) return;

    this.queue = videos.map(video => ({
      video,
      status: 'pending', // pending, downloading, completed, failed
      error: null,
      filename: generateFilename(video),
    }));

    this.currentIndex = -1;
    this.isRunning = true;
    this.aborted = false;

    // Gera CSV antes de iniciar
    this.generateCSV(videos);

    // Abre modal
    this.showModal();
    this.renderQueue();

    // Processa fila
    for (let i = 0; i < this.queue.length; i++) {
      if (this.aborted) break;

      this.currentIndex = i;
      await this.processItem(i, quality);

      // Delay entre downloads
      if (i < this.queue.length - 1 && !this.aborted) {
        await this.delay(1500);
      }
    }

    this.isRunning = false;
    this.updateProgress();
  },

  /**
   * Processa um item da fila
   */
  async processItem(index, quality) {
    const item = this.queue[index];
    item.status = 'downloading';
    this.renderQueue();

    try {
      const downloadUrl = getDownloadUrl(item.video.url, quality, item.filename);

      // Cria link de download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = item.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      item.status = 'completed';
    } catch (error) {
      item.status = 'failed';
      item.error = error.message;
      console.error(`Erro ao baixar ${item.video.caption}:`, error);
    }

    this.renderQueue();
    this.updateProgress();
  },

  /**
   * Cancela todos os downloads
   */
  cancelAll() {
    this.aborted = true;
    this.queue.forEach(item => {
      if (item.status === 'pending' || item.status === 'downloading') {
        item.status = 'failed';
        item.error = 'Cancelado pelo usuario';
      }
    });
    this.isRunning = false;
    this.renderQueue();
    this.updateProgress();
  },

  /**
   * Gera CSV com dados dos videos
   */
  generateCSV(videos) {
    const headers = ['Nome', 'Views', 'Likes', 'Comentarios', 'Duracao', 'Tipo', 'URL'];

    const rows = videos.map(video => [
      `"${(video.caption || 'Sem titulo').replace(/"/g, '""')}"`,
      video.views,
      video.likes,
      video.comments,
      video.duration,
      video.type,
      video.url,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // BOM para UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `instagram_download_${timestamp}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /**
   * Mostra modal de download
   */
  showModal() {
    document.getElementById('download-modal').classList.add('active');
  },

  /**
   * Esconde modal
   */
  hideModal() {
    document.getElementById('download-modal').classList.remove('active');
  },

  /**
   * Atualiza barra de progresso
   */
  updateProgress() {
    const completed = this.queue.filter(i => i.status === 'completed').length;
    const total = this.queue.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('progress-text').textContent =
      `${completed} de ${total} concluidos (${percent}%)`;
  },

  /**
   * Renderiza lista de downloads
   */
  renderQueue() {
    const container = document.getElementById('download-list');

    container.innerHTML = this.queue.map((item, index) => {
      let statusIcon = '';
      switch (item.status) {
        case 'pending':
          statusIcon = '⏳';
          break;
        case 'downloading':
          statusIcon = '⬇️';
          break;
        case 'completed':
          statusIcon = '✅';
          break;
        case 'failed':
          statusIcon = '❌';
          break;
      }

      return `
        <div class="download-item">
          <span class="download-item-status">${statusIcon}</span>
          <div class="download-item-info">
            <div class="download-item-title">${item.video.caption || 'Sem titulo'}</div>
            ${item.error ? `<div class="download-item-error">${item.error}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
