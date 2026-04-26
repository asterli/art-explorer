// ── State ──────────────────────────────────────────────────────────────────
let currentPage = 1;
let totalPages = 1;
let currentArtwork = null;
let debounceTimer = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const sourceFilter  = document.getElementById('sourceFilter');
const hasImageFilter = document.getElementById('hasImageFilter');
const resultsGrid   = document.getElementById('resultsGrid');
const resultsCount  = document.getElementById('resultsCount');
const emptyState    = document.getElementById('emptyState');
const pagination    = document.getElementById('pagination');
const prevBtn       = document.getElementById('prevBtn');
const nextBtn       = document.getElementById('nextBtn');
const pageIndicator = document.getElementById('pageIndicator');
const searchView    = document.getElementById('searchView');
const detailView    = document.getElementById('detailView');
const favoritesView = document.getElementById('favoritesView');
const backBtn       = document.getElementById('backBtn');
const favBtn        = document.getElementById('favBtn');
const brandLink     = document.getElementById('brandLink');

// ── View helpers ───────────────────────────────────────────────────────────
function showView(view) {
  [searchView, detailView, favoritesView].forEach(v => v.classList.add('d-none'));
  view.classList.remove('d-none');

  const onSearch    = view === searchView || view === detailView;
  const searchNavBtn = document.getElementById('searchNavBtn');
  searchNavBtn.className = `btn btn-sm ${onSearch ? 'btn-light' : 'btn-outline-light'}`;
  favBtn.className = `btn btn-sm position-relative ${view === favoritesView ? 'btn-light' : 'btn-outline-light'}`;
}

// ── Search ─────────────────────────────────────────────────────────────────
async function doSearch(page = 1) {
  const q = searchInput.value.trim();
  if (!q) {
    resultsGrid.innerHTML = '';
    emptyState.innerHTML = '<p class="fs-5 text-danger">Please enter a search term.</p>';
    emptyState.classList.remove('d-none');
    pagination.classList.add('d-none');
    return;
  }

  currentPage = page;
  showView(searchView);
  emptyState.classList.add('d-none');
  showSkeletons();

  try {
    const data = await API.search(
      q, page, sourceFilter.value, hasImageFilter.checked
    );
    totalPages = data.totalPages || 0;
    renderResults(data.results, data.total);
    updatePagination();
  } catch (err) {
    resultsGrid.innerHTML = `<p class="text-danger col-12">Error: ${err.message}</p>`;
    pagination.classList.add('d-none');
  }
}

function showSkeletons() {
  resultsCount.classList.add('d-none');
  pagination.classList.add('d-none');
  resultsGrid.innerHTML = Array(8).fill(`
    <div class="col">
      <div class="card h-100">
        <div class="skeleton" style="height:180px;"></div>
        <div class="card-body">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text w-75"></div>
        </div>
      </div>
    </div>`).join('');
}

function renderResults(results, total = 0) {
  if (!results.length) {
    resultsGrid.innerHTML = '';
    resultsCount.classList.add('d-none');
    emptyState.innerHTML = '<p class="fs-5">No artworks found. Try a different search term.</p>';
    emptyState.classList.remove('d-none');
    pagination.classList.add('d-none');
    return;
  }

  emptyState.classList.add('d-none');
  const displayTotal = total > 0 ? total : results.length;
  resultsCount.textContent = `${displayTotal.toLocaleString()} result${displayTotal !== 1 ? 's' : ''} found`;
  resultsCount.classList.remove('d-none');
  resultsGrid.innerHTML = results.map(a => `
    <div class="col">
      <div class="card h-100 artwork-card" data-source="${a.source}" data-id="${a.id}">
        <div class="position-relative">
          ${a.imageUrl
            ? `<img src="${a.imageUrl}" class="card-img-top" alt="${escHtml(a.title)}" style="height:180px;object-fit:cover;">`
            : `<div class="bg-secondary d-flex align-items-center justify-content-center" style="height:180px;">
                 <span class="text-white small">No Image</span>
               </div>`}
          <span class="badge bg-${a.source === 'met' ? 'danger' : 'success'} position-absolute top-0 start-0 m-2">
            ${a.source === 'met' ? 'Met' : 'Harvard'}
          </span>
        </div>
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-1">${escHtml(a.title)}</h6>
          <p class="card-text text-muted small mb-0">${escHtml(a.artist)}</p>
          <p class="card-text text-muted small mt-auto pt-2">${escHtml(a.date || '—')}</p>
        </div>
      </div>
    </div>`).join('');

  resultsGrid.querySelectorAll('.artwork-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.source, card.dataset.id));
  });
}

function updatePagination() {
  if (totalPages < 1) { pagination.classList.add('d-none'); return; }
  pagination.classList.remove('d-none');
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

  const atFirst = currentPage <= 1;
  const atLast  = currentPage >= totalPages;

  prevBtn.disabled = atFirst;
  prevBtn.className = `btn ${atFirst ? 'btn-outline-secondary' : 'btn-outline-primary'}`;

  nextBtn.disabled = atLast;
  nextBtn.className = `btn ${atLast ? 'btn-outline-secondary' : 'btn-outline-primary'}`;
}

// ── Detail view ────────────────────────────────────────────────────────────
async function openDetail(source, id) {
  showView(detailView);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Reset tabs to Overview
  bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-overview')).show();
  document.getElementById('artworkTitle').textContent  = '';
  document.getElementById('artworkArtist').textContent = '';
  document.getElementById('artworkPanel').innerHTML    = '<div class="skeleton" style="height:350px;"></div>';
  document.getElementById('tabOverview').innerHTML     = '<div class="skeleton" style="height:150px;"></div>';
  document.getElementById('tabBiography').innerHTML = '<p class="text-muted">Loading…</p>';
  document.getElementById('tabRelated').innerHTML   = '<p class="text-muted">Loading…</p>';

  try {
    const artwork = await API.getArtwork(source, id);
    currentArtwork = artwork;
    document.getElementById('artworkTitle').textContent  = artwork.title;
    document.getElementById('artworkArtist').textContent = artwork.artist;
    renderArtworkPanel(artwork);
    renderOverview(artwork);

    if (artwork.artist && artwork.artist !== 'Unknown Artist') {
      API.getArtistBio(artwork.artist)
        .then(bio => renderBio(bio))
        .catch(() => {
          document.getElementById('tabBiography').innerHTML =
            '<p class="text-muted">No biography found on Wikipedia.</p>';
        });
      API.getRelatedWorks(artwork.artist)
        .then(data => renderRelated(data.results))
        .catch(() => {
          document.getElementById('tabRelated').innerHTML =
            '<p class="text-muted">No related works found.</p>';
        });
    } else {
      document.getElementById('tabBiography').innerHTML =
        '<p class="text-muted">No artist information available.</p>';
      document.getElementById('tabRelated').innerHTML =
        '<p class="text-muted">No related works found.</p>';
    }
  } catch (err) {
    document.getElementById('tabOverview').innerHTML =
      `<p class="text-danger">Failed to load artwork: ${err.message}</p>`;
  }
}

function renderArtworkPanel(artwork) {
  const isFav = Favorites.isFavorite(artwork.source, artwork.id);
  document.getElementById('artworkPanel').innerHTML = `
    ${artwork.imageUrl
      ? `<img src="${escHtml(artwork.imageUrl)}" class="img-fluid rounded w-100 mb-3" alt="${escHtml(artwork.title)}">`
      : `<div class="bg-secondary rounded d-flex align-items-center justify-content-center mb-3" style="height:300px;">
           <span class="text-white fs-5">No Image Available</span>
         </div>`}
    <button class="btn w-100 ${isFav ? 'btn-danger' : 'btn-outline-danger'}" id="favToggleBtn">
      ${isFav ? '❤ Remove from Favorites' : '🤍 Add to Favorites'}
    </button>`;

  document.getElementById('favToggleBtn').addEventListener('click', () => {
    if (Favorites.isFavorite(artwork.source, artwork.id)) {
      Favorites.remove(artwork.source, artwork.id);
    } else {
      Favorites.add(artwork);
    }
    updateFavCount();
    renderArtworkPanel(artwork);
  });
}

function renderOverview(artwork) {
  const museumUrl = artwork.source === 'met'
    ? `https://www.metmuseum.org/art/collection/search/${artwork.id}`
    : `https://harvardartmuseums.org/collections/object/${artwork.id}`;
  const museumName = artwork.source === 'met' ? 'The Metropolitan Museum of Art' : 'Harvard Art Museums';

  document.getElementById('tabOverview').innerHTML = `
    <div class="d-flex flex-column flex-grow-1">
      <dl class="row mb-0">
        <dt class="col-sm-4">Date</dt>       <dd class="col-sm-8">${escHtml(artwork.date || '—')}</dd>
        <dt class="col-sm-4">Medium</dt>     <dd class="col-sm-8">${escHtml(artwork.medium || '—')}</dd>
        <dt class="col-sm-4">Dimensions</dt> <dd class="col-sm-8">${escHtml(artwork.dimensions || '—')}</dd>
        <dt class="col-sm-4">Department</dt> <dd class="col-sm-8">${escHtml(artwork.department || '—')}</dd>
        <dt class="col-sm-4">Museum</dt>     <dd class="col-sm-8">${escHtml(museumName)}</dd>
      </dl>
      <div class="mt-auto pt-3">
        <a href="${museumUrl}" target="_blank" rel="noopener" class="btn btn-outline-secondary btn-sm">
          View on Museum Website ↗
        </a>
      </div>
    </div>`;
}

function renderBio(bio) {
  document.getElementById('tabBiography').innerHTML = `
    <div class="d-flex gap-4">
      ${bio.thumbnail
        ? `<img src="${escHtml(bio.thumbnail)}" class="rounded flex-shrink-0" style="width:120px;height:120px;object-fit:cover;" alt="${escHtml(bio.title)}">`
        : ''}
      <div>
        <h4>${escHtml(bio.title)}</h4>
        <p>${escHtml(bio.extract || 'No biography available.')}</p>
        ${bio.pageUrl
          ? `<a href="${escHtml(bio.pageUrl)}" target="_blank" rel="noopener" class="btn btn-outline-secondary btn-sm">
               Read full article on Wikipedia →
             </a>`
          : ''}
      </div>
    </div>`;
}

function renderRelated(results) {
  const withImages = (results || []).filter(a => a.imageUrl).slice(0, 8);
  if (!withImages.length) {
    document.getElementById('tabRelated').innerHTML = '<p class="text-muted">No related works found.</p>';
    return;
  }

  document.getElementById('tabRelated').innerHTML = `
    <div class="row row-cols-2 row-cols-md-4 g-3">
      ${withImages.map(a => `
        <div class="col">
          <div class="card artwork-card related-card" data-source="${a.source}" data-id="${a.id}" data-title="${escHtml(a.title)}">
            <img src="${escHtml(a.imageUrl)}" class="card-img-top" alt="${escHtml(a.title)}">
          </div>
        </div>`).join('')}
    </div>`;

  const tooltip = document.getElementById('relatedTooltip');

  document.querySelectorAll('#tabRelated .related-card').forEach(card => {
    card.addEventListener('click', () => {
      tooltip.classList.add('d-none');
      openDetail(card.dataset.source, card.dataset.id);
    });

    card.addEventListener('mouseenter', () => {
      tooltip.textContent = card.dataset.title;
      tooltip.classList.remove('d-none');
    });
    card.addEventListener('mousemove', e => {
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top  = `${e.clientY + 14}px`;
    });
    card.addEventListener('mouseleave', () => {
      tooltip.classList.add('d-none');
    });
  });
}

// ── Favorites view ─────────────────────────────────────────────────────────
function showFavorites() {
  showView(favoritesView);
  const favs = Favorites.getAll();
  const grid = document.getElementById('favoritesGrid');

  const emptyState = document.getElementById('favEmptyState');
  if (!favs.length) {
    grid.innerHTML = '';
    emptyState.classList.remove('d-none');
    return;
  }
  emptyState.classList.add('d-none');

  grid.innerHTML = favs.map(a => `
    <div class="col">
      <div class="card h-100 fav-card artwork-card" data-source="${a.source}" data-id="${a.id}">
        <div class="position-relative">
          ${a.imageUrl
            ? `<img src="${escHtml(a.imageUrl)}" class="card-img-top" alt="${escHtml(a.title)}" style="height:180px;object-fit:cover;">`
            : `<div class="bg-secondary d-flex align-items-center justify-content-center" style="height:180px;">
                 <span class="text-white small">No Image</span>
               </div>`}
          <span class="badge bg-${a.source === 'met' ? 'danger' : 'success'} position-absolute top-0 start-0 m-2">
            ${a.source === 'met' ? 'Met' : 'Harvard'}
          </span>
          <button class="remove-fav-btn btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-0 lh-1"
            data-source="${a.source}" data-id="${a.id}"
            style="width:24px;height:24px;font-size:14px;" title="Remove from Favorites">
            &times;
          </button>
        </div>
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-1">${escHtml(a.title)}</h6>
          <p class="card-text text-muted small mb-0">${escHtml(a.artist)}</p>
          <p class="card-text text-muted small mt-auto pt-2">${escHtml(a.date || '—')}</p>
        </div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.fav-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.source, card.dataset.id));
  });

  grid.querySelectorAll('.remove-fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); // prevent card click from firing
      Favorites.remove(btn.dataset.source, btn.dataset.id);
      updateFavCount();
      showFavorites();
    });
  });
}

// ── Favorites count badge ──────────────────────────────────────────────────
function updateFavCount() {
  const count = Favorites.getAll().length;
  const badge = document.getElementById('favCount');
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ────────────────────────────────────────────────────────
searchBtn.addEventListener('click', () => doSearch(1));

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(1);
});

// Debounced search-as-you-type (300 ms)
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => doSearch(1), 300);
});

// Re-search when the checkbox or source filter changes
hasImageFilter.addEventListener('change', () => doSearch(1));
sourceFilter.addEventListener('change', () => doSearch(1));

prevBtn.addEventListener('click', () => doSearch(currentPage - 1));
nextBtn.addEventListener('click', () => doSearch(currentPage + 1));

backBtn.addEventListener('click', () => showView(searchView));
brandLink.addEventListener('click', e => { e.preventDefault(); showView(searchView); });
document.getElementById('searchNavBtn').addEventListener('click', () => showView(searchView));
favBtn.addEventListener('click', showFavorites);

// Initialise navbar state and badge on page load
showView(searchView);
updateFavCount();

// Init Leaflet map when Location tab becomes visible
document.getElementById('detailTabs').addEventListener('shown.bs.tab', e => {
  if (e.target.id === 'tab-location' && currentArtwork) {
    MapView.init(currentArtwork.source);
  }
});
