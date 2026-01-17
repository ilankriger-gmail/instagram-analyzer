// ========== FILTERS MODULE ==========

const Filters = {
  // Estado dos filtros
  current: {
    period: 'all',
    viewsMin: 0,
    viewsMax: Infinity,
    durationMin: 0,
    durationMax: Infinity,
    sort: 'most_views',
  },

  /**
   * Aplica filtros e ordenacao aos videos
   */
  apply(videos) {
    let filtered = videos.filter(video => {
      // Filtro de periodo
      if (this.current.period !== 'all') {
        const days = parseInt(this.current.period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const videoDate = new Date(video.timestamp);
        if (videoDate < cutoff) return false;
      }

      // Filtro de views
      if (video.views < this.current.viewsMin) return false;
      if (video.views > this.current.viewsMax) return false;

      // Filtro de duracao
      if (video.duration < this.current.durationMin) return false;
      if (video.duration > this.current.durationMax) return false;

      return true;
    });

    // Ordenacao
    filtered.sort((a, b) => {
      switch (this.current.sort) {
        case 'most_views':
          return b.views - a.views;
        case 'least_views':
          return a.views - b.views;
        case 'newest':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'oldest':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'longest':
          return b.duration - a.duration;
        case 'shortest':
          return a.duration - b.duration;
        default:
          return 0;
      }
    });

    return filtered;
  },

  /**
   * Atualiza filtros a partir dos inputs
   */
  updateFromInputs() {
    const period = document.getElementById('filter-period').value;
    const viewsMin = document.getElementById('filter-views-min').value;
    const viewsMax = document.getElementById('filter-views-max').value;
    const durationMin = document.getElementById('filter-duration-min').value;
    const durationMax = document.getElementById('filter-duration-max').value;
    const sort = document.getElementById('filter-sort').value;

    this.current = {
      period,
      viewsMin: viewsMin ? parseInt(viewsMin) : 0,
      viewsMax: viewsMax ? parseInt(viewsMax) : Infinity,
      durationMin: durationMin ? parseInt(durationMin) : 0,
      durationMax: durationMax ? parseInt(durationMax) : Infinity,
      sort,
    };
  },

  /**
   * Reseta filtros para valores padrao
   */
  reset() {
    this.current = {
      period: 'all',
      viewsMin: 0,
      viewsMax: Infinity,
      durationMin: 0,
      durationMax: Infinity,
      sort: 'most_views',
    };

    // Limpa inputs
    document.getElementById('filter-period').value = 'all';
    document.getElementById('filter-views-min').value = '';
    document.getElementById('filter-views-max').value = '';
    document.getElementById('filter-duration-min').value = '';
    document.getElementById('filter-duration-max').value = '';
    document.getElementById('filter-sort').value = 'most_views';
  },
};
