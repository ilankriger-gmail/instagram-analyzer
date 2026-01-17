// ========== INSTAGRAM ANALYZER - MAIN APP ==========

const App = {
  // Estado
  videos: [],
  filteredVideos: [],
  currentTab: 'urls',
  profileData: null,

  /**
   * Inicializa aplicacao
   */
  init() {
    this.bindEvents();
    this.updateUI();
  },

  /**
   * Vincula eventos
   */
  bindEvents() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Buscar URLs
    document.getElementById('btn-fetch-urls').addEventListener('click', () => {
      this.fetchFromUrls();
    });

    // Buscar Perfil
    document.getElementById('btn-fetch-profile').addEventListener('click', () => {
      this.fetchFromProfile();
    });

    // Filtros
    document.getElementById('btn-apply-filters').addEventListener('click', () => {
      this.applyFilters();
    });

    // Selecao
    document.getElementById('btn-top5').addEventListener('click', () => {
      Selection.selectTop(this.filteredVideos, 5);
      this.renderVideos();
      this.updateSelectionUI();
    });

    document.getElementById('btn-bottom5').addEventListener('click', () => {
      Selection.selectBottom(this.filteredVideos, 5);
      this.renderVideos();
      this.updateSelectionUI();
    });

    document.getElementById('btn-select-all').addEventListener('click', () => {
      Selection.selectAll(this.filteredVideos.map(v => v.shortcode));
      this.renderVideos();
      this.updateSelectionUI();
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
      Selection.clear();
      this.renderVideos();
      this.updateSelectionUI();
    });

    // Download
    document.getElementById('btn-download').addEventListener('click', () => {
      this.startDownload();
    });

    // Modal
    document.getElementById('modal-close').addEventListener('click', () => {
      Download.hideModal();
    });

    document.getElementById('btn-cancel-all').addEventListener('click', () => {
      Download.cancelAll();
    });

    // Enter no input de username
    document.getElementById('username-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.fetchFromProfile();
      }
    });
  },

  /**
   * Troca de tab
   */
  switchTab(tab) {
    this.currentTab = tab;

    // Atualiza tabs
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Atualiza conteudo
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tab}`);
    });
  },

  /**
   * Busca videos a partir de URLs
   */
  async fetchFromUrls() {
    const textarea = document.getElementById('urls-input');
    const urls = textarea.value
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      alert('Cole pelo menos uma URL do Instagram');
      return;
    }

    this.showLoading();

    try {
      const result = await validateUrls(urls);

      const validVideos = result.results
        .filter(r => r.valid)
        .map(r => r.video);

      if (validVideos.length === 0) {
        alert('Nenhuma URL valida encontrada');
        this.hideLoading();
        return;
      }

      this.videos = validVideos;
      this.filteredVideos = validVideos;

      // Esconde filtros no modo URLs
      document.getElementById('filters-section').style.display = 'none';

      this.renderVideos();
      this.updateUI();

    } catch (error) {
      console.error('Erro ao buscar URLs:', error);
      alert(`Erro: ${error.message}`);
    }

    this.hideLoading();
  },

  /**
   * Busca videos de um perfil
   */
  async fetchFromProfile() {
    const username = document.getElementById('username-input').value.trim();
    const type = document.getElementById('media-type').value;

    if (!username) {
      alert('Digite um nome de usuario');
      return;
    }

    this.showLoading();

    try {
      const result = await fetchProfile(username, type);

      if (result.error) {
        alert(`Erro: ${result.error}`);
        this.hideLoading();
        return;
      }

      this.profileData = result;
      this.videos = result.videos || [];

      // Aplica filtros padrao (ordenado por mais views)
      Filters.reset();
      this.filteredVideos = Filters.apply(this.videos);

      // Mostra filtros
      document.getElementById('filters-section').style.display = 'block';

      this.renderVideos();
      this.updateUI();

    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      alert(`Erro: ${error.message}`);
    }

    this.hideLoading();
  },

  /**
   * Aplica filtros aos videos
   */
  applyFilters() {
    Filters.updateFromInputs();
    this.filteredVideos = Filters.apply(this.videos);
    Selection.clear();
    this.renderVideos();
    this.updateUI();
  },

  /**
   * Renderiza grid de videos
   */
  renderVideos() {
    const grid = document.getElementById('videos-grid');

    if (this.filteredVideos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📹</div>
          <div class="empty-state-text">Nenhum video encontrado</div>
        </div>
      `;
      return;
    }

    // Calcula ranking para badges
    const sortedByViews = [...this.filteredVideos].sort((a, b) => b.views - a.views);
    const top5 = new Set(sortedByViews.slice(0, 5).map(v => v.shortcode));
    const bottom5 = new Set(sortedByViews.slice(-5).map(v => v.shortcode));

    grid.innerHTML = this.filteredVideos.map(video => {
      const isSelected = Selection.isSelected(video.shortcode);
      const isTop = top5.has(video.shortcode);
      const isBottom = bottom5.has(video.shortcode) && !isTop;

      return `
        <div class="video-card ${isSelected ? 'selected' : ''}" data-shortcode="${video.shortcode}">
          <div class="video-checkbox">${isSelected ? '✓' : ''}</div>
          ${isTop ? '<div class="video-badge top">TOP 5</div>' : ''}
          ${isBottom ? '<div class="video-badge bottom">BOTTOM 5</div>' : ''}
          <img
            class="video-thumbnail"
            src="${video.thumbnail}"
            alt="${video.caption}"
            loading="lazy"
          >
          <div class="video-type">${video.type}</div>
          <div class="video-duration">${formatDuration(video.duration)}</div>
          <div class="video-info">
            <div class="video-caption">${video.caption || 'Sem titulo'}</div>
            <div class="video-stats">
              <span class="video-stat">👁 ${formatNumber(video.views)}</span>
              <span class="video-stat">❤️ ${formatNumber(video.likes)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind click events
    grid.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', () => {
        const shortcode = card.dataset.shortcode;
        Selection.toggle(shortcode);
        this.renderVideos();
        this.updateSelectionUI();
      });
    });
  },

  /**
   * Inicia downloads
   */
  startDownload() {
    const selectedVideos = Selection.getSelectedVideos(this.filteredVideos);

    if (selectedVideos.length === 0) {
      alert('Selecione pelo menos um video');
      return;
    }

    const quality = document.getElementById('quality-select').value;
    Download.start(selectedVideos, quality);
  },

  /**
   * Atualiza UI geral
   */
  updateUI() {
    const hasVideos = this.filteredVideos.length > 0;

    // Selecao
    document.getElementById('selection-section').style.display = hasVideos ? 'block' : 'none';

    // Barra de download
    document.getElementById('download-bar').style.display = hasVideos ? 'flex' : 'none';

    this.updateSelectionUI();
  },

  /**
   * Atualiza UI de selecao
   */
  updateSelectionUI() {
    const count = Selection.count;

    document.getElementById('selected-count').textContent = count;
    document.getElementById('download-count').textContent = count;

    const downloadBtn = document.getElementById('btn-download');
    downloadBtn.disabled = count === 0;
  },

  /**
   * Mostra loading
   */
  showLoading() {
    document.getElementById('loading').style.display = 'flex';
  },

  /**
   * Esconde loading
   */
  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  },
};

// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());
