// Thin wrappers around backend endpoints
const API = {
  async search(q, page, source, hasImage) {
    const params = new URLSearchParams({ q, page, source });
    if (hasImage) params.set('hasImage', 'true');
    const res = await fetch(`/api/search?${params}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Search failed');
    return res.json();
  },

  async getArtwork(source, id) {
    const res = await fetch(`/api/artwork/${source}/${id}`);
    if (!res.ok) throw new Error('Failed to load artwork');
    return res.json();
  },

  async getArtistBio(name) {
    const res = await fetch(`/api/artist/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error('Artist not found');
    return res.json();
  },

  async getRelatedWorks(name) {
    const res = await fetch(`/api/artist/${encodeURIComponent(name)}/works`);
    if (!res.ok) throw new Error('Failed to load related works');
    return res.json();
  },
};
