const map = L.map('map').setView([7.8731, 80.7718], 7);

// Adding OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Marker icons
const icons = {
  vocational: L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2965/2965567.png',
    iconSize: [32, 32]
  }),
  educational: L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/685/685352.png',
    iconSize: [32, 32]
  }),

  health: L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/685/685352.png',
    iconSize: [32, 32]
  }),
};

// GeoJSON file paths
const geojsonPaths = {
  vocational: 'https://raw.githubusercontent.com/Kavish20021203/INFRASTRUCTURE/main/Vocational.geojson',
  educational: 'https://raw.githubusercontent.com/Kavish20021203/INFRASTRUCTURE/main/Educational.geojson',
  health: 'https://raw.githubusercontent.com/Kavish20021203/INFRASTRUCTURE/main/Hospitals.geojson',
};

// Defining categorization field for each layer type
const categorizedFields = {
  vocational: 'name_of_th',       
  educational: 'school_lev',
  health: 'hospital_c'      
};

// Layer groups to store loaded GeoJSON and category info
const layerGroups = {};

for (const type in geojsonPaths) {
  fetch(geojsonPaths[type])
    .then(response => response.json())
    .then(data => {
      const field = categorizedFields[type];
      const categories = [...new Set(data.features.map(f => f.properties?.[field]))];

      // Assigning style based on category
      const getCategoryStyle = (category) => {
        const index = categories.indexOf(category);
        const radius = 6 + index * 2; 
        const color = categoryColor(index); 
        return {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 1
        };
      };

      const layer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const cat = feature.properties?.[field];
          return L.circleMarker(latlng, getCategoryStyle(cat));
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          let popupContent = `<strong>${props.name || 'Unknown'}</strong><br><em>${type}</em><br><br>`;
          for (const key in props) {
            if (key !== 'name') {
              popupContent += `<strong>${key}:</strong> ${props[key]}<br>`;
            }
          }
          layer.bindPopup(popupContent);
        }
      });

      layerGroups[type] = {
        layer: layer,
        categories: categories,
        field: field
      };

      // Adding default visible layer
      if (type === "vocational") {
        map.addLayer(layer);
        updateLegend(type);
      }
    })
    .catch(err => {
      console.error(`Failed to load ${type} layer:`, err);
    });
}

// Updating both map layers and radio button states
document.querySelectorAll('input[name="layer"]').forEach(input => {
  input.addEventListener('change', function () {
    const selectedType = this.value;

    if (!layerGroups[selectedType]) {
      console.warn(`${selectedType} layer not loaded yet.`);
      return;
    }

    // Removing existing layers from map
    for (const type in layerGroups) {
      if (map.hasLayer(layerGroups[type].layer)) {
        map.removeLayer(layerGroups[type].layer);
      }
    }

    // Adding selected layer
    map.addLayer(layerGroups[selectedType].layer);
    updateLegend(selectedType);

    // Updating radio card active styling
    document.querySelectorAll('.radio-card').forEach(card => {
      card.classList.remove('active');
    });

    // Setting the checked state manually (in case DOM didn't sync)
    this.checked = true;

    // Adding .active class to parent label
    this.closest('.radio-card').classList.add('active');
  });
});

// Color generator for category index
function categoryColor(index) {
  const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
                  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
  return colors[index % colors.length];
}

// Updatinhg legend for categorized strings
function updateLegend(type) {
  const legend = document.getElementById("legend-content");
  if (!legend || !layerGroups[type]) return;

  const { categories, field } = layerGroups[type];
  legend.innerHTML = `<h4>${field} (Categories)</h4>`;

  categories.forEach((cat, index) => {
  const color = categoryColor(index);
  legend.innerHTML += `
    <div class="legend-entry">
      <div class="legend-color-circle" style="background: ${color};"></div>
      <div class="legend-label">${cat}</div>
    </div>`;
  });
}

const NorthControl = L.Control.extend({
  options: {
    position: 'topright' 
  },
  onAdd: function () {
    const container = L.DomUtil.create('div', 'leaflet-control-north');
    return container;
  }
});

map.addControl(new NorthControl());

console.log("Before anything, google.maps=", typeof google !== 'undefined' && google.maps);

// --------- User's Location on Load ----------
map.locate({ setView: true, maxZoom: 14 });
map.on('locationfound', e => {
  L.circleMarker(e.latlng, {
    radius: 8,
    fillColor: '#2b6cb0',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(map).bindPopup("You are here").openPopup();
});

map.on('locationerror', e => {
  alert("Unable to determine your location.");
});

// --------- Search Feature ----------
document.getElementById('search-btn').addEventListener('click', () => {
  const query = document.getElementById('search-input').value;
  if (!query) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const result = data[0];
        const lat = result.lat;
        const lon = result.lon;
        map.setView([lat, lon], 15);
        L.marker([lat, lon]).addTo(map).bindPopup(result.display_name).openPopup();
      } else {
        alert('Location not found.');
      }
    });
});

// --------- Distance Calculator ----------
let distancePoints = [];
let distanceLine = null;

document.getElementById('start-distance').addEventListener('click', () => {
  map.getContainer().style.cursor = 'crosshair';

  map.on('click', onMapClick);
  
});

document.getElementById('undo-point').addEventListener('click', () => {
  if (distancePoints.length > 0) {
    map.removeLayer(distancePoints.pop());

    // Removing red line if exists
    if (distanceLine) {
      map.removeLayer(distanceLine);
      distanceLine = null;
    }

    // Removing Google route if exists ✅
    if (googleRoutePolyline) {
      map.removeLayer(googleRoutePolyline);
      googleRoutePolyline = null;
    }

    // Clearing distance result text
    document.getElementById('distance-result').innerText = '';
  }
});

function onMapClick(e) {
  if (distancePoints.length >= 2) return;

  const marker = L.marker(e.latlng).addTo(map);
  distancePoints.push(marker);

  if (distancePoints.length === 2) {
    const latlngs = distancePoints.map(m => m.getLatLng());
    distanceLine = L.polyline(latlngs, { color: 'red' }).addTo(map);

    const dist = latlngs[0].distanceTo(latlngs[1]) / 1000; // in km
    document.getElementById('distance-result').innerText = `Distance: ${dist.toFixed(2)} km`;

    if (distancePoints.length === 2) {
    if (typeof getGoogleRoute === "function") {
      getGoogleRoute(latlngs[0], latlngs[1]);
    } else {
      console.warn("Google API not ready—getGoogleRoute is not a function");
    }
  }

    // Fetching and showing shortest road route using Google API
    getGoogleRoute(latlngs[0], latlngs[1]);

    map.getContainer().style.cursor = '';
    map.off('click', onMapClick);
  }
}

let googleRoutePolyline = null;

function getGoogleRoute(origin, destination) {
  console.log("called getGoogleRoute; google.maps:", typeof google !== 'undefined' && google.maps);
  const directionsService = new google.maps.DirectionsService();

  directionsService.route({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelMode: google.maps.TravelMode.DRIVING
  }, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      const route = result.routes[0].overview_path;
      const leafletCoords = route.map(coord => [coord.lat(), coord.lng()]);

      // Draw polyline
      if (googleRoutePolyline) {
        map.removeLayer(googleRoutePolyline);
      }

      googleRoutePolyline = L.polyline(leafletCoords, {
        color: 'blue',
        weight: 5,
        opacity: 0.8
      }).addTo(map);

      // Extracting and displaying travel time
      const duration = result.routes[0].legs[0].duration.text; // e.g., "1 hour 5 mins"
      const distance = result.routes[0].legs[0].distance.text; // e.g., "52.3 km"

      document.getElementById('distance-result').innerText = 
        `Distance: ${distance} | Travel Time: ${duration}`;

    } else {
      console.error('Google Directions API error:', status);
      alert("Failed to fetch shortest route. Try again.");
    }
  });
}

function initGoogle() {
  console.log("✅ initGoogle() called, google.maps loaded:", typeof google.maps);
}

