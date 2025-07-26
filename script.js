// 1.Map Initialization & Configuration


// Initializing map centered on Sri Lanka
const map = L.map('map').setView([7.8731, 80.7718], 7);

// Adding OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Adding geocoder for search functionality
L.Control.geocoder().addTo(map);


// 2. Data Configuration & Data Definitions

// GeoJSON data URLs for different migration layers
const geojsonData = {
  layer1: "https://raw.githubusercontent.com/Kavish20021203/New-Web-Mapping/main/Internal%20Retention%20Rate%20(%25).geojson",
  layer2: "https://raw.githubusercontent.com/Kavish20021203/New-Web-Mapping/main/In%20Migration%20Density.geojson",
  layer3: "https://raw.githubusercontent.com/Kavish20021203/New-Web-Mapping/main/Out%20Migration%20Density.geojson",
  layer4: "https://raw.githubusercontent.com/Kavish20021203/New-Web-Mapping/main/Net%20Migration%20Final.geojson"
};

// Field names corresponding to each layer's data attribute
const layerFields = {
  layer1: "Inter.rate",
  layer2: "Migrant D.",
  layer3: "M.Density",
  layer4: "Density"
};

// Displaying titles for each layer
const layerTitles = {
  layer1: "INTERNAL RETENTION RATE",
  layer2: "IN-MIGRATION DENSITY",
  layer3: "OUT-MIGRATION DENSITY",
  layer4: "NET MIGRATION DENSITY"
};

// Legend labels and ranges for each layer
const legendLabels = {
  layer1: ["≤92", "92.1-95.9", "96-104.9", "105-112", ">112.1"],
  layer2: ["≤19", "19.1-30", "30.1-41", "41.1-62", ">62.1"],
  layer3: ["≤14.9", "15-23.4", "23.5-59.9", "60-115.1", ">115.2"],
  layer4: [  "≤ -123.826","-123.825 – -52.381","-52.380 – -10.206","5.292 – 13.593","> 13.593"],

};

// Variable to track currently active map layer
let activeLayer = null;


// 3. Styling & Color

/**
 * Returns appropriate color based on data value and layer type
 * @param {number} d - Data value
 * @param {string} layerKey - Layer identifier
 * @returns {string} - Hex color code
 */
function getColor(d, layerKey) {
  d = Number(d);
  console.log("getColor called with:", { d, layerKey });

  // Handling missing or invalid data
  if (isNaN(d)) {
    console.warn("Invalid value for d:", d, "in layer:", layerKey);
    return '#cccccc'; 
  }

  if (layerKey === "layer1") {
    console.log("Using Green (layer1) color scale");
    return d > 112.1 ? '#005a32' :
           d > 104.9 ? '#238b45' :
           d > 95.9  ? '#41ab5d' :
           d > 92    ? '#74c476' :
                       '#c7e9c0';

  } else if (layerKey === "layer2") {
    console.log("Using Blue (layer2) color scale");
    return d > 62.1 ? '#084081' :
           d > 41   ? '#0868ac' :
           d > 30   ? '#2b8cbe' :
           d > 19   ? '#4eb3d3' :
                      '#c6dbef';

  } else if (layerKey === "layer3") {
    console.log("Using Red (layer3) color scale");
    return d > 115.2 ? '#67000d' :
           d > 60    ? '#a50f15' :
           d > 23.4  ? '#cb181d' :
           d > 14.9  ? '#ef3b2c' :
                       '#fee0d2';

} else if (layerKey === "layer4") {
  console.log("Using Extended Diverging (layer4) color scale");
  return d <= -123.826  ? '#67000d' :   
         d <= -52.381   ? '#a50f15' :   
         d <= -10.206   ? '#ef3b2c'  :   
         d <= 5.291     ? '#74c476' :   
         d <= 13.593    ? '#41ab5d' :  
                          '#005a32'; 
  } else {
    console.warn("Unknown layerKey:", layerKey);
    return '#cccccc'; 
  }
}


// 4. Legend Management

/**
 * Creates and displays legend for the specified layer
 * @param {string} layerKey - Layer identifier
 */
function createLegend(layerKey) {
  const field = layerFields[layerKey];
  const labels = legendLabels[layerKey];
  const legendDiv = document.getElementById('legendContent');

  legendDiv.innerHTML = "<strong>" + layerTitles[layerKey] + "</strong><br>";

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    let sampleValue;

    try {
      // Case 1: Range like "-91789--26171" or "-26170-18385"
      const matchDoubleDash = label.match(/^(-?\d+(?:\.\d+)?)--(-?\d+(?:\.\d+)?)/);
      if (matchDoubleDash) {
        const low = parseFloat(matchDoubleDash[1]);
        const high = parseFloat(matchDoubleDash[2]);
        sampleValue = (low + high) / 2;
      } 
      else {
        // Case 2: Try splitting on space-hyphen-space
        const parts = label.split(/\s*-\s*/).map(v => parseFloat(v));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          sampleValue = (parts[0] + parts[1]) / 2;
        }
        // Case 3: "≤-91790" or "≤ 10"
        else if (label.includes("≤")) {
          const raw = label.replace(/[^\d.-]/g, '');
          sampleValue = parseFloat(raw);
          if (label.includes('-') && !raw.startsWith('-')) sampleValue = -sampleValue;
          sampleValue -= 1;
        }
        // Case 4: ">-26171" or "> 5"
        else if (label.includes(">")) {
          const raw = label.replace(/[^\d.-]/g, '');
          sampleValue = parseFloat(raw);
          if (label.includes('-') && !raw.startsWith('-')) sampleValue = -sampleValue;
          sampleValue += 1;
        }
        // Case 5: fallback - just try to extract number
        else {
          const raw = label.replace(/[^\d.-]/g, '');
          sampleValue = parseFloat(raw);
          if (label.includes('-') && !raw.startsWith('-')) sampleValue = -sampleValue;
        }
      }

      // Final check
      if (isNaN(sampleValue)) {
        console.warn(`⚠️ Invalid label "${label}" — sampleValue is NaN`);
        sampleValue = 0; // fallback to neutral
      }

      const color = getColor(sampleValue, layerKey);
      console.log(`Legend entry: [${label}] uses sampleValue: ${sampleValue}, color: ${color}`);

      legendDiv.innerHTML += `
        <i style="background:${color}; width:18px; height:18px; display:inline-block; margin-right:6px;"></i> ${label}<br>`;
    } catch (err) {
      console.error(`❌ Error parsing label "${label}":`, err);
    }
  }
}


// 5. Layer Loading & Management

/**
 * Loads and displays the specified GeoJSON layer on the map
 * @param {string} layerKey - Layer identifier
 */
function loadLayer(layerKey) {
  // Removing currently active layer
  if (activeLayer) {
    map.removeLayer(activeLayer);
  }

  const field = layerFields[layerKey];

  // Fetching and processing GeoJSON data
  fetch(geojsonData[layerKey])
    .then(response => response.json())
    .then(data => {

      // Creating new GeoJSON layer with styling and interactivity
      activeLayer = L.geoJSON(data, {
        style: feature => {
          const value = parseFloat(feature.properties[field]);
          return {
            fillColor: getColor(value, layerKey),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {

          // Creating popup with all feature attributes
          let popupContent = "<b>Attributes:</b><br/>";
          for (const key in feature.properties) {
            if (feature.properties.hasOwnProperty(key)) {
              popupContent += `<strong>${key}</strong>: ${feature.properties[key]}<br/>`;
            }
          }
          layer.bindPopup(popupContent);
        }
      }).addTo(map);

      // Updating legend for new layer
      createLegend(layerKey);
    })
    .catch(error => {
      console.error("Error loading GeoJSON layer:", error);
    });
}

// 6. Layer Control Event Handlers

// Loading initial layer on page load
loadLayer("layer1");

// Event listener for layer selection via radio buttons
document.getElementById('layerControls').addEventListener('change', function (e) {
  if (e.target && e.target.name === 'layer') {
    loadLayer(e.target.value);
  }
});


// 7. District Analysis - Modal & Charts


// DOM element references for district analysis
const districtDropdown = document.getElementById('districtDropdown');
const modal = document.getElementById('districtModal');
const closeModal = document.getElementById('closeModal');
const reasonsCtx = document.getElementById('reasonsChart').getContext('2d');
const durationCtx = document.getElementById('durationChart').getContext('2d');

// Chart instances and data storage
let reasonsChart, durationChart;
let csvData = [];


// 8. CSVData Loading

// Loading migration reasons CSV data on page initialization
Papa.parse('https://raw.githubusercontent.com/Kavish20021203/INFRASTRUCTURE/main/ReasonsMigration.csv', {
  download: true,
  header: true,
  complete: function(results) {
    csvData = results.data;
    console.log('CSV data loaded successfully');
  },
  error: function(error) {
    console.error('Error loading CSV data:', error);
  }
});


// 9. Creating & Configuring Charts

/**
 * Returns shared configuration options for pie charts
 * @param {string} title - Chart title
 * @returns {object} - Chart.js options object
 */
function getSharedChartOptions(title) {
  return {
    responsive: true,
    animation: {
      animateRotate: true,
      duration: 1200,
      easing: 'easeOutBounce'
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 18, weight: 'bold' }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 20,
          font: { size: 14 }
        }
      },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold' },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          const percentage = (value / total * 100).toFixed(1);
          return `${percentage}%`;
        }
      }
    }
  };
}

// 10. District Selection Event Handler

// Handling district selection and chart generation
districtDropdown.addEventListener('change', () => {
  const selectedDistrict = districtDropdown.value;

  // Finding district data in CSV
  const districtInfo = csvData.find(row => 
    row.District.trim().toLowerCase() === selectedDistrict.trim().toLowerCase()
  );

  if (!districtInfo) {
    alert('No data found for selected district.');
    return;
  }

  // Extracting migration reasons data
  const reasonsData = [
    parseFloat(districtInfo.Marriage) || 0,
    parseFloat(districtInfo.Employment) || 0,
    parseFloat(districtInfo.Education) || 0,
    parseFloat(districtInfo.Displacement) || 0,
    parseFloat(districtInfo.Resettlement) || 0,
    parseFloat(districtInfo.Development_Projects) || 0,
    parseFloat(districtInfo["Family Needs"]) || 0,
    parseFloat(districtInfo.Other) || 0
  ];

  // Extracting duration data
  const durationData = [
    parseInt(districtInfo["Less than 05 years"]) || 0,
    parseInt(districtInfo["Between 05-09 Years"]) || 0,
    parseInt(districtInfo["10Yeras & Above"]) || 0
  ];

  // Showing the modal
  modal.style.display = 'block';

  // Destroying existing charts if they exist
  if (reasonsChart) reasonsChart.destroy();
  if (durationChart) durationChart.destroy();

  // Creating Migration Reasons Pie Chart
  reasonsChart = new Chart(reasonsCtx, {
    type: 'pie',
    data: {
      labels: [
        'Marriage', 'Employment', 'Education', 'Displacement',
        'Resettlement', 'Development Projects', 'Family Needs', 'Other'
      ],
      datasets: [{
        data: reasonsData,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#A569BD',
          '#8AFFC1', '#B266FF', '#FFA07A', '#A9A9A9'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: getSharedChartOptions(`Reasons for Migration - ${selectedDistrict}`),
    plugins: [ChartDataLabels]
  });

  // Creating Duration of Residence Pie Chart
  durationChart = new Chart(durationCtx, {
    type: 'pie',
    data: {
      labels: ['< 5 Years', '5 to 9 Years', '10 Years & Above'],
      datasets: [{
        data: durationData,
        backgroundColor: ['#4BC0C0', '#FF9F40', '#9966FF'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: getSharedChartOptions(`Duration of Residence - ${selectedDistrict}`),
    plugins: [ChartDataLabels]
  });
});


// 11. Modal Control Event Handlers

// Closing modal when X button is clicked
closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Closing modal when clicking outside the modal content
window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Open Form Modal
  document.getElementById('infoButton').addEventListener('click', function () {
    document.getElementById('userFormModal').style.display = 'block';
  });

  // Close Form Modal
  document.getElementById('closeFormModal').addEventListener('click', function () {
    document.getElementById('userFormModal').style.display = 'none';
  });

  // Show/hide 'Other' input based on selection
  document.getElementById('reasonSelect').addEventListener('change', function () {
    const otherField = document.getElementById('otherReasonLabel');
    if (this.value === 'Other') {
      otherField.style.display = 'block';
      document.getElementById('otherReasonInput').required = true;
    } else {
      otherField.style.display = 'none';
      document.getElementById('otherReasonInput').required = false;
    }
  });

  // Handling form submission 
  document.getElementById('userInfoForm').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Form submitted successfully!');
    this.reset();
    document.getElementById('userFormModal').style.display = 'none';
  });

  // Form Submission + Redirect
  document.getElementById('userInfoForm').addEventListener('submit', function (e) {
    e.preventDefault();

  // Redirecting to the new infrastructure map interface
  window.location.href = 'C:/Users/kavis/OneDrive/Documents/3rd Year Sem 05/Advanced/Assiignment - Web Mapping/Final CODES/INFRASTRUCTURE/Infrastructure.html'; 
  });

// 12. INFRASTRUCTURE Button Handler

// Handling infrastructure button click (placeholder for future functionality)
document.getElementById('infoButton').addEventListener('click', () => {

  // Future infrastructure data visualization can be added here
  console.log('Infrastructure button clicked');
  alert('Infrastructure data visualization coming soon!');
});


// 13. Utility Functions & Error Handling

/**
 * Handle map loading errors gracefully
 */
map.on('error', function(e) {
  console.error('Map error:', e);
});

/**
 * Log successful map load
 */
map.on('load', function() {
  console.log('Map loaded successfully');
});


// 14. INITIALIZATION COMPLETE

console.log('Migration Analytics Web Map initialized successfully');
console.log('Available layers:', Object.keys(geojsonData));
console.log('Active layer:', 'layer1 (Internal Retention Rate)');

        function submitButton() {
            document.getElementById("google_homeDistrict").value = document.getElementById("homeDistrict").value;
            document.getElementById("google_homeGND").value = document.getElementById("homeGND").value;
            document.getElementById("google_occupation").value = document.getElementById("occupation").value;
            document.getElementById("google_duration").value = document.getElementById("duration").value;
            document.getElementById("google_destDistrict").value = document.getElementById("destDistrict").value;
            document.getElementById("google_destGND").value = document.getElementById("destGND").value;
            document.getElementById("google_reasonSelect").value = document.getElementById("reasonSelect").value;
            document.getElementById("google_familyMembers").value = document.getElementById("familyMembers").value;
            document.getElementById("google_belowAge5").value = document.getElementById("belowAge5").value;
            document.getElementById("google_age5to18").value = document.getElementById("age5to18").value;
            document.getElementById("google_age18to59").value = document.getElementById("age18to59").value;
            document.getElementById("google_aboveAge59").value = document.getElementById("aboveAge59").value;

            document.getElementById("googleform").submit();
            alert("Form is Submitted Successfully");
            document.getElementById("mainform").reset();
        }

        function submitButton() {

          // 1) copy modal inputs into hidden Google Form fields
          const fields = [
            'homeDistrict','homeGND','occupation','duration',
            'destDistrict','destGND','reasonSelect',
            'familyMembers','belowAge5','age5to18','age18to59','aboveAge59'
          ];
          fields.forEach(id => {
            document.getElementById('google_' + id).value =
              document.getElementById(id).value;
          });

          // 2) submit into hidden iframe
          document.getElementById('googleform').submit();

          // 3) give feedback & reset
          alert('Form submitted successfully!');
          document.getElementById('userInfoForm').reset();
          document.getElementById('userFormModal').style.display = 'none';

          // 4) after a short pause, go to your Infrastructure dashboard
          setTimeout(() => {
            window.location.href = 'index1.html';
          }, 500);
        }

        
        
