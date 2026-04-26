require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HARVARD_API_KEY = process.env.HARVARD_API_KEY;

app.use(express.static(path.join(__dirname, 'public')));

// --- Helpers ---

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ArtExplorer/1.0)',
};

async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function normalizeMet(obj) {
  return {
    id: String(obj.objectID),
    source: 'met',
    title: obj.title || 'Untitled',
    artist: obj.artistDisplayName || 'Unknown Artist',
    date: obj.objectDate || '',
    medium: obj.medium || '',
    dimensions: obj.dimensions || '',
    imageUrl: obj.primaryImageSmall || obj.primaryImage || '',
    department: obj.department || '',
  };
}

function normalizeHarvard(obj) {
  const image =
    obj.primaryimageurl ||
    (obj.images && obj.images[0] && obj.images[0].baseimageurl) ||
    '';
  const person = obj.people && obj.people[0];
  return {
    id: String(obj.objectid),
    source: 'harvard',
    title: obj.title || 'Untitled',
    artist: person ? person.displayname : 'Unknown Artist',
    date: obj.dated || '',
    medium: obj.medium || '',
    dimensions: obj.dimensions || '',
    imageUrl: image,
    department: obj.division || '',
  };
}

// --- Met helpers ---

async function searchMet(q, page, onlyImages, size) {
  let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(q)}`;
  if (onlyImages) url += '&hasImages=true';

  const data = await fetchJSON(url);
  const allIds = data.objectIDs || [];
  const total = allIds.length;
  const totalPages = total > 0 ? Math.ceil(total / size) : 0;
  const pageIds = allIds.slice((page - 1) * size, page * size);

  const items = await Promise.all(
    pageIds.map(id =>
      fetchJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
        .then(normalizeMet)
        .catch(() => null)
    )
  );

  const filtered = items.filter(item => item && (!onlyImages || item.imageUrl));
  return { items: filtered, totalPages, total };
}

// --- Harvard helpers ---

async function searchHarvard(q, page, onlyImages, size) {
  if (!HARVARD_API_KEY) return { items: [], totalPages: 0 };

  let url = `https://api.harvardartmuseums.org/object?keyword=${encodeURIComponent(q)}&apikey=${HARVARD_API_KEY}&size=${size}&page=${page}`;
  if (onlyImages) url += '&hasimage=1';

  const data = await fetchJSON(url);
  const records = data.records || [];
  const total = data.info ? data.info.totalrecords : 0;
  const totalPages = total > 0 ? Math.ceil(total / size) : 0;

  const items = records.map(normalizeHarvard).filter(item => !onlyImages || item.imageUrl);
  return { items, totalPages, total };
}

// --- Routes ---

// GET /api/search?q=&page=&source=&hasImage=
app.get('/api/search', async (req, res) => {
  const { q, page = '1', source = 'both', hasImage } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const onlyImages = hasImage === 'true';
  // When fetching from both sources, split page size evenly
  const isB = source === 'both';
  const size = isB ? 6 : 12;

  try {
    const [metData, harvardData] = await Promise.all([
      source === 'met' || isB
        ? searchMet(q, pageNum, onlyImages, size)
        : Promise.resolve({ items: [], totalPages: 0 }),
      source === 'harvard' || isB
        ? searchHarvard(q, pageNum, onlyImages, size)
        : Promise.resolve({ items: [], totalPages: 0 }),
    ]);

    const results = [...metData.items, ...harvardData.items];
    const totalPages = Math.max(metData.totalPages, harvardData.totalPages, results.length > 0 ? 1 : 0);
    const total = (metData.total || 0) + (harvardData.total || 0);

    res.json({ results, page: pageNum, totalPages, total });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/artwork/:source/:id
app.get('/api/artwork/:source/:id', async (req, res) => {
  const { source, id } = req.params;
  try {
    if (source === 'met') {
      const data = await fetchJSON(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
      );
      return res.json(normalizeMet(data));
    }
    if (source === 'harvard') {
      if (!HARVARD_API_KEY) return res.status(503).json({ error: 'Harvard API key not configured' });
      const data = await fetchJSON(
        `https://api.harvardartmuseums.org/object/${id}?apikey=${HARVARD_API_KEY}`
      );
      return res.json(normalizeHarvard(data));
    }
    res.status(400).json({ error: 'Invalid source' });
  } catch (err) {
    console.error('Artwork fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

// GET /api/artist/:name  — Wikipedia biography
app.get('/api/artist/:name', async (req, res) => {
  try {
    const name = encodeURIComponent(req.params.name);
    const data = await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${name}`);
    res.json({
      title: data.title,
      extract: data.extract,
      thumbnail: data.thumbnail ? data.thumbnail.source : null,
      pageUrl: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : null,
    });
  } catch (err) {
    res.status(404).json({ error: 'Artist not found on Wikipedia' });
  }
});

// GET /api/artist/:name/works  — related works from both APIs
app.get('/api/artist/:name/works', async (req, res) => {
  const name = req.params.name;
  try {
    const [metData, harvardData] = await Promise.all([
      searchMet(name, 1, false, 6).catch(() => ({ items: [] })),
      searchHarvard(name, 1, false, 6).catch(() => ({ items: [] })),
    ]);
    res.json({ results: [...metData.items, ...harvardData.items] });
  } catch (err) {
    console.error('Related works error:', err.message);
    res.status(500).json({ error: 'Failed to fetch related works' });
  }
});

// GET /  — serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Art Explorer running on http://localhost:${PORT}`);
});
