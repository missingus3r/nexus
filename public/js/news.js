let userCountry = null;
let userLocation = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Setup listeners
    document.getElementById('showAllToggle').addEventListener('change', () => {
        loadNews();
    });

    document.getElementById('radiusSelect').addEventListener('change', () => {
        loadNews();
    });

    // Get user location
    await getUserLocation();

    // Load news based on user location
    await loadNews();
});

async function getUserLocation() {
    try {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            document.getElementById('locationInfo').textContent = '(Ubicación no disponible)';
            return;
        }

        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            });
        });

        const { latitude, longitude } = position.coords;
        userLocation = { lat: latitude, lon: longitude };

        // Reverse geocode to get country and city
        const countryData = await reverseGeocode(latitude, longitude);
        if (countryData && countryData.countryCode) {
            userCountry = countryData.countryCode;
            // Extract city from display name
            const parts = countryData.displayName.split(',');
            const city = parts[0] || 'Tu ubicación';
            document.getElementById('locationInfo').textContent =
                `📍 ${city}`;
        } else {
            document.getElementById('locationInfo').textContent = '📍 Ubicación detectada';
        }
    } catch (error) {
        console.log('Location error:', error.message);
        document.getElementById('locationInfo').textContent = '(Ubicación no disponible)';
    }
}

async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            {
                headers: { 'User-Agent': 'Vortex-UY/1.0' }
            }
        );
        const data = await response.json();
        return {
            country: data.address?.country,
            countryCode: data.address?.country_code?.toUpperCase()
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

async function loadNews() {
    try {
        const showAll = document.getElementById('showAllToggle').checked;
        const radius = document.getElementById('radiusSelect').value;

        let url = '/api/news?';

        // Use proximity search if location is available and not showing all
        if (userLocation && !showAll) {
            url += `lat=${userLocation.lat}&lon=${userLocation.lon}&radius=${radius}`;
            console.log(`Loading news within ${radius}km of location`);
        } else if (!showAll && userCountry) {
            // Fallback to country filter if no location
            url += `country=${userCountry}`;
        } else if (showAll) {
            // Show all news (no filter)
            url += 'showAll=true';
        } else {
            // Default bbox for Uruguay if no location and no filters
            url += 'bbox=-58.5,-35,-53,-30';
        }

        const response = await fetch(url, {
            credentials: 'include'
        });

        const data = await response.json();
        displayNews(data.features, showAll, radius);
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('newsTimeline').innerHTML = '<p class="text-center">Error al cargar noticias</p>';
    }
}

function displayNews(newsItems, showAll, radius) {
    const timeline = document.getElementById('newsTimeline');

    if (newsItems.length === 0) {
        let message;
        if (showAll) {
            message = 'No hay noticias disponibles en este momento';
        } else if (userLocation) {
            message = `No hay noticias dentro de ${radius}km de tu ubicación. Aumenta el radio o activa "Mostrar todas".`;
        } else {
            message = `No hay noticias disponibles. Activa "Mostrar todas" para ver más.`;
        }
        timeline.innerHTML = `<p class="text-center">${message}</p>`;
        return;
    }

    timeline.innerHTML = newsItems.map(item => {
        const props = item.properties;
        const date = new Date(props.date).toLocaleDateString('es-UY');

        return `
            <div class="news-item">
                <h3>${props.title}</h3>
                <div class="news-meta">
                    <strong>${props.source}</strong> - ${date} - ${props.locationName || 'Uruguay'}
                </div>
                <p>${props.excerpt || ''}</p>
                <a href="${props.url}" target="_blank">Leer más &rarr;</a>
            </div>
        `;
    }).join('');
}

