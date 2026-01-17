// ========== SELECTION MODULE ==========

const Selection = {
  MAX_SELECTION: 10,
  selected: new Set(),

  /**
   * Verifica se video esta selecionado
   */
  isSelected(shortcode) {
    return this.selected.has(shortcode);
  },

  /**
   * Alterna selecao de um video
   */
  toggle(shortcode) {
    if (this.selected.has(shortcode)) {
      this.selected.delete(shortcode);
      return false;
    }

    if (this.selected.size >= this.MAX_SELECTION) {
      alert(`Limite de ${this.MAX_SELECTION} videos atingido!`);
      return false;
    }

    this.selected.add(shortcode);
    return true;
  },

  /**
   * Seleciona video
   */
  select(shortcode) {
    if (this.selected.size >= this.MAX_SELECTION) {
      return false;
    }
    this.selected.add(shortcode);
    return true;
  },

  /**
   * Remove selecao
   */
  deselect(shortcode) {
    this.selected.delete(shortcode);
  },

  /**
   * Limpa todas as selecoes
   */
  clear() {
    this.selected.clear();
  },

  /**
   * Seleciona todos (ate o limite)
   */
  selectAll(shortcodes) {
    this.clear();
    for (const shortcode of shortcodes) {
      if (this.selected.size >= this.MAX_SELECTION) break;
      this.selected.add(shortcode);
    }
  },

  /**
   * Seleciona TOP N (mais views)
   */
  selectTop(videos, n = 5) {
    this.clear();
    const sorted = [...videos].sort((a, b) => b.views - a.views);
    for (let i = 0; i < Math.min(n, sorted.length, this.MAX_SELECTION); i++) {
      this.selected.add(sorted[i].shortcode);
    }
  },

  /**
   * Seleciona BOTTOM N (menos views)
   */
  selectBottom(videos, n = 5) {
    this.clear();
    const sorted = [...videos].sort((a, b) => a.views - b.views);
    for (let i = 0; i < Math.min(n, sorted.length, this.MAX_SELECTION); i++) {
      this.selected.add(sorted[i].shortcode);
    }
  },

  /**
   * Retorna videos selecionados
   */
  getSelectedVideos(videos) {
    return videos.filter(v => this.selected.has(v.shortcode));
  },

  /**
   * Retorna contagem de selecionados
   */
  get count() {
    return this.selected.size;
  },

  /**
   * Verifica se atingiu limite
   */
  get isFull() {
    return this.selected.size >= this.MAX_SELECTION;
  },
};
