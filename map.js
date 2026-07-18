// Responsive Leaflet map: light-gray default + Satellite + Topographic.
// Emoji markers per category (no colors, no ruled-out).
import { MAP_POINTS, MAP_CATEGORIES } from './data.js';

let map = null;
const markers = {};

export function initMap() {
  if (map) return map;

  map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([61.3, -147.6], 6);

  const bases = {
    'Light gray': L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO' }
    ),
    Satellite: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, attribution: 'Tiles © Esri, Maxar' }
    ),
    Topographic: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap · © OpenStreetMap contributors',
    }),
  };
  bases['Light gray'].addTo(map);
  L.control.layers(bases, null, { position: 'topright', collapsed: true }).addTo(map);

  MAP_POINTS.forEach((p) => {
    const emoji = MAP_CATEGORIES[p.cat] || '📍';
    const icon = L.divIcon({
      className: 'leaflet-div-emoji',
      html: emoji,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const m = L.marker(p.coords, { icon }).addTo(map);
    m.bindPopup(`<strong>${emoji} ${p.name}</strong><br>${p.blurb}`);
    markers[p.id] = m;
  });

  // Leaflet needs a size recalc when its tab becomes visible.
  setTimeout(() => map.invalidateSize(), 50);
  return map;
}

export function refreshMap() {
  if (map) setTimeout(() => map.invalidateSize(), 30);
}

export function flyToPoint(id) {
  const p = MAP_POINTS.find((x) => x.id === id);
  if (!p || !map) return;
  map.flyTo(p.coords, p.cat === 'wilderness' ? 9 : 8, { duration: 0.7 });
  const m = markers[id];
  if (m) setTimeout(() => m.openPopup(), 550);
}
