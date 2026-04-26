// localStorage-backed favorites store
const Favorites = {
  KEY: 'art-explorer-favorites',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  },

  add(artwork) {
    const favs = this.getAll();
    if (!this.isFavorite(artwork.source, artwork.id)) {
      favs.push(artwork);
      localStorage.setItem(this.KEY, JSON.stringify(favs));
    }
  },

  remove(source, id) {
    const favs = this.getAll().filter(f => !(f.source === source && f.id === id));
    localStorage.setItem(this.KEY, JSON.stringify(favs));
  },

  isFavorite(source, id) {
    return this.getAll().some(f => f.source === source && f.id === id);
  },
};
