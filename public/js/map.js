// Leaflet map for the Location tab
const MapView = {
  map: null,

  LOCATIONS: {
    met: {
      lat: 40.7794, lng: -73.9632,
      name: 'The Metropolitan Museum of Art',
      address: '1000 Fifth Avenue, New York, NY 10028',
    },
    harvard: {
      lat: 42.3744, lng: -71.1143,
      name: 'Harvard Art Museums',
      address: '32 Quincy Street, Cambridge, MA 02138',
    },
  },

  init(source) {
    const loc = this.LOCATIONS[source];
    if (!loc) return;

    // Render heading and address above the map
    document.getElementById('mapInfo').innerHTML = `
      <h5 class="mb-0">${loc.name}</h5>
      <p class="text-muted small mb-0">${loc.address}</p>`;

    // Destroy previous instance before re-initialising
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = L.map('map').setView([loc.lat, loc.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    L.marker([loc.lat, loc.lng])
      .addTo(this.map)
      .bindPopup(`<b>${loc.name}</b><br>${loc.address}`)
      .openPopup();
  },
};
