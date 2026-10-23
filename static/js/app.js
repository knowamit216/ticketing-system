const stationCache = new Map();
const stationKey = value => String(value || '').trim().toLocaleLowerCase('en-IN');

function rememberStation(station) {
    if (station.name) stationCache.set(stationKey(station.name), station);
    if (station.code) stationCache.set(stationKey(station.code), station);
    return station;
}

async function searchStationDirectory(query = '') {
    const params = new URLSearchParams({ q: query, limit: '12' });
    const response = await fetch(`/api/stations?${params}`);
    if (!response.ok) throw new Error('Station directory unavailable');
    const matches = await response.json();
    matches.forEach(rememberStation);
    return matches;
}

async function resolveStation(value) {
    const query = String(value || '').trim();
    if (!query) return null;
    const cached = stationCache.get(stationKey(query));
    if (cached) return cached;
    const matches = await searchStationDirectory(query);
    return matches.find(station => stationKey(station.name) === stationKey(query) || stationKey(station.code) === stationKey(query)) || null;
}

const fromInput = document.querySelector('#from-station');
const toInput = document.querySelector('#to-station');
const fromCode = document.querySelector('#from-code');
const toCode = document.querySelector('#to-code');
const dateInput = document.querySelector('#journey-date');
const resultsSection = document.querySelector('#results');
const toast = document.querySelector('#toast');
let toastTimer;
const recentSearchesKey = 'rail-demo-recent-searches';
let currentLocation = null;
let locationWatchId = null;
let lastNearbyLookup = 0;
let routeMapInstance = null;
let routeMapLayers = null;
let routeMapUserMarker = null;

function localIsoDate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

const today = localIsoDate(new Date());
dateInput.min = today;
dateInput.value = today;
document.querySelectorAll('[data-date-offset]').forEach(button => {
    button.addEventListener('click', () => {
        const date = new Date();
        date.setDate(date.getDate() + Number(button.dataset.dateOffset));
        dateInput.value = localIsoDate(date);
        document.querySelectorAll('[data-date-offset]').forEach(item => {
            const selected = item === button;
            item.classList.toggle('selected', selected);
            item.setAttribute('aria-pressed', String(selected));
        });
    });
});
dateInput.addEventListener('change', () => {
    const offset = Math.round((new Date(`${dateInput.value}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000);
    document.querySelectorAll('[data-date-offset]').forEach(button => {
        const selected = Number(button.dataset.dateOffset) === offset;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
});
const chartDateInput = document.querySelector('#chart-date');
chartDateInput.min = today;
chartDateInput.value = today;

function codeFor(name) {
    return stationCache.get(stationKey(name))?.code || '----';
}

const routeParams = new URLSearchParams(window.location.search);
for (const [param, input, codeLabel] of [['from', fromInput, fromCode], ['to', toInput, toCode]]) {
    const requestedName = routeParams.get(param);
    if (requestedName) input.value = requestedName.trim();
}
const requestedDate = routeParams.get('date');
if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && requestedDate >= today) {
    dateInput.value = requestedDate;
    dateInput.dispatchEvent(new Event('change'));
}
const requestedClass = routeParams.get('class');
if (requestedClass && [...document.querySelector('#travel-class').options].some(option => option.value === requestedClass)) {
    document.querySelector('#travel-class').value = requestedClass;
}

function stationDescription(station) {
    return [station.code, station.zone, station.state || station.address].filter(Boolean).join(' · ');
}

function setStationCodeLabel(codeLabel, station) {
    codeLabel.textContent = station?.code || '—';
    codeLabel.title = [station?.address, station?.state, station?.zone, station?.latitude != null && station?.longitude != null ? `${station.latitude}, ${station.longitude}` : ''].filter(Boolean).join(' · ');
}

function attachSuggestions(input, codeLabel) {
    const field = input.closest('.station-field');
    const panel = field.querySelector('.suggestions');
    let requestNumber = 0;
    let searchTimer;
    const draw = async () => {
        const query = input.value.trim();
        const currentRequest = ++requestNumber;
        panel.replaceChildren();
        panel.classList.add('open');
        const loading = document.createElement('div');
        loading.className = 'suggestion-empty';
        loading.textContent = 'Searching stations…';
        panel.append(loading);
        try {
            const matches = await searchStationDirectory(query);
            if (currentRequest !== requestNumber || !field.contains(document.activeElement)) return;
            panel.replaceChildren();
            matches.forEach(station => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'suggestion';
                option.setAttribute('role', 'option');
                const name = document.createElement('span');
                name.textContent = station.name;
                const detail = document.createElement('small');
                detail.textContent = stationDescription(station) || 'Station directory match';
                option.append(name, detail);
                option.addEventListener('click', () => {
                    rememberStation(station);
                    input.value = station.name;
                    setStationCodeLabel(codeLabel, station);
                    panel.classList.remove('open');
                    input.focus();
                });
                panel.append(option);
            });
            if (!matches.length) {
                const empty = document.createElement('div');
                empty.className = 'suggestion-empty';
                empty.textContent = 'No match. Try the station code or another spelling.';
                panel.append(empty);
            }
            panel.classList.add('open');
        } catch {
            if (currentRequest !== requestNumber) return;
            panel.replaceChildren();
            const unavailable = document.createElement('div');
            unavailable.className = 'suggestion-empty';
            unavailable.textContent = 'Station directory could not be loaded. Try again in a moment.';
            panel.append(unavailable);
        }
    };
    input.addEventListener('focus', draw);
    input.addEventListener('input', () => {
        setStationCodeLabel(codeLabel, stationCache.get(stationKey(input.value)));
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(draw, 130);
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') panel.classList.remove('open');
        if (event.key === 'Enter' && panel.classList.contains('open')) {
            const first = panel.querySelector('.suggestion');
            if (first) { event.preventDefault(); first.click(); }
        }
    });
    document.addEventListener('click', event => {
        if (!field.contains(event.target)) panel.classList.remove('open');
    });
}

attachSuggestions(fromInput, fromCode);
attachSuggestions(toInput, toCode);
for (const [param, input, codeLabel] of [['from', fromInput, fromCode], ['to', toInput, toCode]]) {
    if (routeParams.has(param)) resolveStation(input.value).then(station => station && setStationCodeLabel(codeLabel, station));
}

function readRecentSearches() {
    try {
        const stored = JSON.parse(localStorage.getItem(recentSearchesKey) || '[]');
        return Array.isArray(stored) ? stored.filter(item => item && typeof item.from === 'string' && typeof item.to === 'string' && typeof item.date === 'string' && typeof item.travelClass === 'string').slice(0, 4) : [];
    } catch {
        return [];
    }
}

function renderRecentSearches() {
    const recent = document.querySelector('#recent-searches');
    const list = document.querySelector('#recent-search-list');
    const searches = readRecentSearches();
    list.replaceChildren();
    recent.hidden = searches.length === 0;
    searches.forEach(search => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recent-search-chip';
        button.textContent = `${search.from} → ${search.to}`;
        button.title = `${search.from} to ${search.to}, ${prettyDate(search.date)}, ${search.travelClass}`;
        button.addEventListener('click', async () => {
            fromInput.value = search.from;
            toInput.value = search.to;
            setStationCodeLabel(fromCode, null);
            setStationCodeLabel(toCode, null);
            try {
                const [fromStation, toStation] = await Promise.all([resolveStation(search.from), resolveStation(search.to)]);
                if (fromStation) setStationCodeLabel(fromCode, fromStation);
                if (toStation) setStationCodeLabel(toCode, toStation);
            } catch {
                showToast('Station details could not be loaded. You can still edit the search.');
            }
            dateInput.value = search.date >= today ? search.date : today;
            document.querySelector('#travel-class').value = search.travelClass;
            dateInput.dispatchEvent(new Event('change'));
            showToast('Recent journey added to your search.');
        });
        list.append(button);
    });
}

renderRecentSearches();

document.querySelector('#swap-stations').addEventListener('click', () => {
    [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
    fromCode.textContent = codeFor(fromInput.value);
    toCode.textContent = codeFor(toInput.value);
});

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3100);
}

function prettyDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateRouteMap(fromStation, toStation) {
    const preview = document.querySelector('#route-map-preview');
    const mapElement = document.querySelector('#route-map-art');
    const valid = station => station?.latitude != null && station?.longitude != null && Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
    if (!valid(fromStation) || !valid(toStation)) {
        preview.hidden = true;
        return;
    }
    if (!window.L) {
        mapElement.replaceChildren();
        mapElement.textContent = 'Interactive map unavailable. Check your internet connection and try again.';
        preview.hidden = false;
        return;
    }
    const start = [Number(fromStation.latitude), Number(fromStation.longitude)];
    const end = [Number(toStation.latitude), Number(toStation.longitude)];
    if (!routeMapInstance) {
        mapElement.replaceChildren();
        routeMapInstance = window.L.map(mapElement, { scrollWheelZoom: false, zoomControl: true });
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).addTo(routeMapInstance);
        routeMapLayers = window.L.layerGroup().addTo(routeMapInstance);
    }
    routeMapLayers.clearLayers();
    const addStationMarker = (station, coordinates, color) => {
        const marker = window.L.circleMarker(coordinates, { radius: 7, color, weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(routeMapLayers);
        const popup = document.createElement('strong');
        popup.textContent = `${station.name}${station.code ? ` · ${station.code}` : ''}`;
        marker.bindPopup(popup);
    };
    addStationMarker(fromStation, start, '#26769b');
    addStationMarker(toStation, end, '#df803d');
    window.L.polyline([start, end], { color: '#3987a9', weight: 4, opacity: .82, dashArray: '8 8' }).addTo(routeMapLayers);
    const points = [start, end];
    if (currentLocation) {
        const here = [currentLocation.latitude, currentLocation.longitude];
        routeMapUserMarker = window.L.circleMarker(here, { radius: 8, color: '#fff', weight: 3, fillColor: '#8457c8', fillOpacity: 1 }).bindPopup('Your current location').addTo(routeMapLayers);
        points.push(here);
    } else {
        routeMapUserMarker = null;
    }
    preview.hidden = false;
    window.setTimeout(() => {
        if (!routeMapInstance) return;
        routeMapInstance.invalidateSize({ pan: false });
        routeMapInstance.fitBounds(window.L.latLngBounds(points).pad(.22), { maxZoom: currentLocation ? 6 : 7, animate: true });
    }, 80);
    const radians = value => Number(value) * Math.PI / 180;
    const lat1 = radians(fromStation.latitude), lat2 = radians(toStation.latitude);
    const dLat = lat2 - lat1, dLon = radians(toStation.longitude - fromStation.longitude);
    const a = Math.min(1, Math.max(0, Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2));
    const distance = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    document.querySelector('#map-from-name').textContent = `${fromStation.name}${fromStation.code ? ` · ${fromStation.code}` : ''}`;
    document.querySelector('#map-to-name').textContent = `${toStation.name}${toStation.code ? ` · ${toStation.code}` : ''}`;
    document.querySelector('#map-distance').textContent = `About ${distance.toLocaleString('en-IN')} km apart`;
}

function setLocationFeedback(message) {
    document.querySelector('#location-feedback').textContent = message;
}

async function findNearestStation(location, selectAsOrigin = false) {
    const params = new URLSearchParams({ lat: String(location.latitude), lon: String(location.longitude), limit: '1' });
    try {
        const response = await fetch(`/api/stations/nearby?${params}`);
        if (!response.ok) throw new Error('Nearby station search failed');
        const [nearest] = await response.json();
        if (!nearest) throw new Error('No station coordinates are available nearby');
        if (selectAsOrigin) {
            fromInput.value = nearest.name;
            setStationCodeLabel(fromCode, nearest);
        }
        const action = selectAsOrigin ? 'Origin set to' : 'Nearest station';
        setLocationFeedback(`${action}: ${nearest.name}${nearest.code ? ` (${nearest.code})` : ''} · about ${nearest.distance_km} km straight-line. Location is not saved.`);
    } catch {
        setLocationFeedback('Could not find a nearby station. You can still enter a station manually.');
    }
}

function receiveLocation(position, selectAsOrigin = false) {
    currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
    };
    setLocationFeedback(`Location found (about ±${Math.round(currentLocation.accuracy)} m). Finding nearby stations…`);
    const now = Date.now();
    if (selectAsOrigin || now - lastNearbyLookup > 30000) {
        lastNearbyLookup = now;
        findNearestStation(currentLocation, selectAsOrigin);
    }
    if (routeMapInstance) {
        if (routeMapUserMarker) routeMapLayers.removeLayer(routeMapUserMarker);
        routeMapUserMarker = window.L.circleMarker([currentLocation.latitude, currentLocation.longitude], { radius: 8, color: '#fff', weight: 3, fillColor: '#8457c8', fillOpacity: 1 }).bindPopup('Your current location').addTo(routeMapLayers);
        if (selectAsOrigin || locationWatchId !== null) routeMapInstance.panTo([currentLocation.latitude, currentLocation.longitude], { animate: true, duration: .5 });
    }
}

function locationError(error) {
    const messages = {
        1: 'Location permission was denied. You can still choose a station manually.',
        2: 'Your location is unavailable right now. Try again or choose a station manually.',
        3: 'Finding your location timed out. Try again or choose a station manually.',
    };
    setLocationFeedback(messages[error.code] || 'Could not get your location. You can choose a station manually.');
}

function locationOptions() {
    return { enableHighAccuracy: false, maximumAge: 10000, timeout: 12000 };
}

document.querySelector('#use-my-location').addEventListener('click', () => {
    if (!navigator.geolocation) return setLocationFeedback('Location is not supported in this browser. Choose a station manually.');
    setLocationFeedback('Finding your location…');
    try {
        navigator.geolocation.getCurrentPosition(position => receiveLocation(position, true), locationError, locationOptions());
    } catch {
        setLocationFeedback('The browser blocked location access. Check site permissions or choose a station manually.');
    }
});

const trackingButton = document.querySelector('#toggle-location-tracking');
trackingButton.addEventListener('click', () => {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
        trackingButton.setAttribute('aria-pressed', 'false');
        trackingButton.innerHTML = '<i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> Track my location';
        setLocationFeedback('My location tracking stopped. Your location is not saved.');
        return;
    }
    if (!navigator.geolocation) return setLocationFeedback('Location is not supported in this browser. Choose a station manually.');
    trackingButton.setAttribute('aria-pressed', 'true');
    trackingButton.innerHTML = '<i class="fa-solid fa-stop" aria-hidden="true"></i> Stop tracking';
    setLocationFeedback('My location is shared with this page while tracking is on; it is not saved.');
    try {
        locationWatchId = navigator.geolocation.watchPosition(position => receiveLocation(position), error => {
            locationError(error);
            if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
            trackingButton.setAttribute('aria-pressed', 'false');
            trackingButton.innerHTML = '<i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> Track my location';
        }, locationOptions());
    } catch {
        locationWatchId = null;
        trackingButton.setAttribute('aria-pressed', 'false');
        trackingButton.innerHTML = '<i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> Track my location';
        setLocationFeedback('The browser blocked location access. Check site permissions or choose a station manually.');
    }
});
window.addEventListener('pagehide', () => {
    if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
});

let currentRoute = null;

const bookingModes = {
    book: { form: document.querySelector('#search-form'), title: 'PLAN A JOURNEY' },
    pnr: { form: document.querySelector('#pnr-form'), title: 'PNR ENQUIRY' },
    charts: { form: document.querySelector('#charts-form'), title: 'CHARTS / VACANCY' },
};

function setBookingMode(mode) {
    if (!bookingModes[mode]) return;
    Object.entries(bookingModes).forEach(([key, entry]) => {
        entry.form.hidden = key !== mode;
    });
    document.querySelector('.booking-heading h2').textContent = bookingModes[mode].title;
    document.querySelectorAll('[data-booking-tab]').forEach(tab => {
        const selected = tab.dataset.bookingTab === mode;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
    });
    document.querySelectorAll('#main-nav .nav-link').forEach(link => {
        const linkMode = link.dataset.serviceTab || (link.getAttribute('href') === '#book' ? 'book' : '');
        link.classList.toggle('active', linkMode === mode);
    });
    const recent = document.querySelector('#recent-searches');
    recent.hidden = mode !== 'book' || readRecentSearches().length === 0;
    renderTrackedPnrs();
}

document.querySelectorAll('[data-booking-tab]').forEach(tab => {
    tab.addEventListener('click', () => setBookingMode(tab.dataset.bookingTab));
});
document.querySelectorAll('[data-service-tab]').forEach(link => {
    link.addEventListener('click', () => setBookingMode(link.dataset.serviceTab));
});
const pnrStorageKey = 'rail-demo-pnr-tracker-v1';
const officialPnrUrl = 'https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en';

function readTrackedPnrs() {
    try {
        const stored = JSON.parse(localStorage.getItem(pnrStorageKey) || '[]');
        return Array.isArray(stored) ? stored.filter(item => item && /^\d{10}$/.test(item.number)) : [];
    } catch {
        return [];
    }
}

function renderTrackedPnrs() {
    const section = document.querySelector('#pnr-tracker');
    const list = document.querySelector('#pnr-tracker-list');
    const entries = readTrackedPnrs();
    list.replaceChildren();
    const activeMode = document.querySelector('[data-booking-tab].active')?.dataset.bookingTab;
    section.hidden = entries.length === 0 || (activeMode && activeMode !== 'pnr');
    entries.forEach(entry => {
        const card = document.createElement('article');
        card.className = 'pnr-tracker-card';
        const details = document.createElement('div');
        details.className = 'pnr-tracker-details';
        const number = document.createElement('strong');
        number.textContent = `PNR ••••••${entry.number.slice(-4)}`;
        const state = document.createElement('small');
        state.textContent = `Saved ${new Date(entry.savedAt).toLocaleDateString()} · status needs an official check`;
        details.append(number, state);
        const actions = document.createElement('div');
        actions.className = 'pnr-tracker-actions';
        const check = document.createElement('a');
        check.href = officialPnrUrl;
        check.target = '_blank';
        check.rel = 'noopener noreferrer';
        check.className = 'pnr-check-link';
        check.textContent = 'Check status';
        check.setAttribute('aria-label', `Check status for PNR ending ${entry.number.slice(-4)} on the official railway website`);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'pnr-remove-button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove saved PNR ending ${entry.number.slice(-4)}`);
        remove.addEventListener('click', () => {
            try {
                localStorage.setItem(pnrStorageKey, JSON.stringify(readTrackedPnrs().filter(item => item.number !== entry.number)));
                renderTrackedPnrs();
            } catch {
                announcePnrStorageError();
            }
        });
        actions.append(check, remove);
        card.append(details, actions);
        list.append(card);
    });
}

function announcePnrStorageError() {
    const feedback = document.querySelector('#pnr-feedback');
    feedback.textContent = 'This browser could not save PNRs. Check that local storage is available, then try again.';
    feedback.hidden = false;
}

document.querySelector('#pnr-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector('#pnr-number');
    const pnr = input.value.trim();
    input.setCustomValidity('');
    if (!/^\d{10}$/.test(pnr)) {
        input.setCustomValidity('Enter exactly 10 digits.');
        input.reportValidity();
        return;
    }
    const feedback = document.querySelector('#pnr-feedback');
    const entries = readTrackedPnrs();
    if (entries.some(item => item.number === pnr)) {
        feedback.textContent = 'This PNR is already saved below. Open its official enquiry to check current status.';
    } else {
        try {
            localStorage.setItem(pnrStorageKey, JSON.stringify([{ number: pnr, savedAt: new Date().toISOString() }, ...entries].slice(0, 10)));
            feedback.textContent = 'PNR saved on this device. Current railway status is not available in this demo; use Check status below for the official enquiry.';
            input.value = '';
        } catch {
            announcePnrStorageError();
            return;
        }
    }
    feedback.hidden = false;
    renderTrackedPnrs();
});

renderTrackedPnrs();

document.querySelector('#charts-form').addEventListener('submit', event => {
    event.preventDefault();
    const feedback = document.querySelector('#charts-feedback');
    feedback.replaceChildren();
    const result = document.createElement('div');
    result.className = 'sample-status-card';
    const train = document.querySelector('#chart-train').value.trim();
    const date = document.querySelector('#chart-date').value;
    result.innerHTML = '<span class="status-pill">OFFICIAL INDIAN RAILWAYS</span><strong></strong><small></small>';
    result.querySelector('strong').textContent = `${train} · live chart enquiry`;
    result.querySelector('small').textContent = `Open the official chart page and select the travel date (${prettyDate(date)}).`;
    const url = 'https://indianrail.gov.in/enquiry/CHART/ChartLogin.jsp';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open official chart / vacancy enquiry';
    feedback.append(result, link);
    feedback.hidden = false;
});

const passengerList = document.querySelector('#passenger-list');
const passengerTemplate = document.querySelector('#passenger-row-template');
let passengerRowNumber = 0;
document.querySelector('#add-passenger').addEventListener('click', () => {
    const row = passengerTemplate.content.firstElementChild.cloneNode(true);
    const rowNumber = passengerRowNumber++;
    row.querySelector('.passenger-name-field label').htmlFor = `passenger-${rowNumber}-name`;
    row.querySelector('.passenger-name-field input').id = `passenger-${rowNumber}-name`;
    row.querySelector('.passenger-age-field label').htmlFor = `passenger-${rowNumber}-age`;
    row.querySelector('.passenger-age-field input').id = `passenger-${rowNumber}-age`;
    row.querySelector('.passenger-gender-field label').htmlFor = `passenger-${rowNumber}-gender`;
    row.querySelector('.passenger-gender-field select').id = `passenger-${rowNumber}-gender`;
    row.querySelector('.remove-passenger-button').addEventListener('click', () => row.remove());
    passengerList.append(row);
    row.querySelector('input').focus();
});

function collectPassengers() {
    return [...passengerList.querySelectorAll('.passenger-row')].map(row => ({
        name: row.querySelector('.passenger-name-field input').value.trim(),
        age: row.querySelector('.passenger-age-field input').value,
        gender: row.querySelector('.passenger-gender-field select').value,
    }));
}

function renderPassengerSummary(passengers) {
    const summary = document.querySelector('#passenger-summary');
    const list = document.querySelector('#passenger-summary-list');
    list.replaceChildren();
    passengers.forEach(passenger => {
        const item = document.createElement('li');
        const details = [passenger.age ? `${passenger.age} years` : '', passenger.gender].filter(Boolean);
        item.textContent = details.length ? `${passenger.name} · ${details.join(' · ')}` : passenger.name;
        list.append(item);
    });
    summary.hidden = passengers.length === 0;
}

document.querySelector('#search-form').addEventListener('submit', async event => {
    event.preventDefault();
    let fromStation;
    let toStation;
    try {
        [fromStation, toStation] = await Promise.all([resolveStation(fromInput.value), resolveStation(toInput.value)]);
    } catch {
        return showToast('The station directory is unavailable. Please try again.');
    }
    if (!fromStation || !toStation) return showToast('Choose a station from the suggestions or enter its station code.');
    if (fromStation.code && fromStation.code === toStation.code) return showToast('Choose two different stations for your journey.');
    if (stationKey(fromStation.name) === stationKey(toStation.name)) return showToast('Choose two different stations for your journey.');
    rememberStation(fromStation);
    rememberStation(toStation);
    fromInput.value = fromStation.name;
    toInput.value = toStation.name;
    setStationCodeLabel(fromCode, fromStation);
    setStationCodeLabel(toCode, toStation);
    const from = fromStation.name;
    const to = toStation.name;
    if (!dateInput.value || dateInput.value < today) return showToast('Choose today or a future journey date.');

    const fromLabel = fromStation.code ? ` (${fromStation.code})` : '';
    const toLabel = toStation.code ? ` (${toStation.code})` : '';
    document.querySelector('#result-route').textContent = `${from}${fromLabel} → ${to}${toLabel} · ${prettyDate(dateInput.value)}`;
    const travelClass = document.querySelector('#travel-class').value;
    const passengers = collectPassengers();
    currentRoute = { from, to, date: dateInput.value, fromStation, toStation, travelClass, passengers };
    renderPassengerSummary(passengers);
    document.querySelector('#route-summary-from').textContent = `${from}${fromLabel}`;
    document.querySelector('#route-summary-to').textContent = `${to}${toLabel}`;
    document.querySelector('#route-summary-date').textContent = prettyDate(dateInput.value);
    document.querySelector('#route-summary-class').textContent = travelClass;
    document.querySelector('#irctc-search-link').href = 'https://www.irctc.co.in/nget/train-search';
    document.querySelector('#ntes-search-link').href = 'https://enquiry.indianrail.gov.in/ntes/';
    const recentSearches = [{ from, to, date: dateInput.value, travelClass }, ...readRecentSearches().filter(item => !(item.from === from && item.to === to && item.travelClass === travelClass))].slice(0, 4);
    try { localStorage.setItem(recentSearchesKey, JSON.stringify(recentSearches)); } catch { /* Search still works when storage is unavailable. */ }
    renderRecentSearches();
    resultsSection.hidden = false;
    updateRouteMap(fromStation, toStation);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelectorAll('.route-card').forEach(card => {
    card.addEventListener('click', () => {
        fromInput.value = card.dataset.from;
        toInput.value = card.dataset.to;
        const codes = card.dataset.codes.split('|');
        fromCode.textContent = codes[0];
        toCode.textContent = codes[1];
        showToast('Route added to your search. Choose a date and press Search.');
        document.querySelector('#book').scrollIntoView({ behavior: 'smooth' });
        toInput.focus({ preventScroll: true });
    });
});

function journeyText() {
    if (!currentRoute) return '';
    const { from, to, fromStation, toStation, date, travelClass } = currentRoute;
    return [
        'Journey plan · not a railway booking',
        `From: ${from}${fromStation.code ? ` (${fromStation.code})` : ''}`,
        `To: ${to}${toStation.code ? ` (${toStation.code})` : ''}`,
        `Date: ${prettyDate(date)}`,
        `Class preference: ${travelClass}`,
        ...(currentRoute.passengers.length ? ['', 'Passengers:', ...currentRoute.passengers.map((passenger, index) => {
            const details = [passenger.age ? `${passenger.age} years` : '', passenger.gender].filter(Boolean);
            return `${index + 1}. ${passenger.name}${details.length ? ` · ${details.join(' · ')}` : ''}`;
        })] : []),
        'Check current train times, availability, and fares on IRCTC before travel.'
    ].join('\n');
}

document.querySelector('#copy-journey-details').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(journeyText());
        showToast('Journey details copied.');
    } catch {
        showToast('Copy is unavailable here. Use Download itinerary instead.');
    }
});
document.querySelector('#download-journey-details').addEventListener('click', () => {
    const file = new Blob([journeyText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'journey-plan.txt';
    link.click();
    URL.revokeObjectURL(url);
});

const contrastToggle = document.querySelector('#contrast-toggle');
contrastToggle.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('high-contrast');
    contrastToggle.setAttribute('aria-pressed', String(enabled));
    contrastToggle.setAttribute('aria-label', `${enabled ? 'Disable' : 'Enable'} high contrast`);
    contrastToggle.title = `${enabled ? 'Disable' : 'Enable'} high contrast`;
    showToast(`High contrast ${enabled ? 'enabled' : 'disabled'}.`);
});

const mobileMenu = document.querySelector('#mobile-menu');
const mainNav = document.querySelector('#main-nav');
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.booking-card, .train-card, .route-card, .service-card').forEach(surface => {
        surface.addEventListener('pointermove', event => {
            const bounds = surface.getBoundingClientRect();
            surface.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
            surface.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
        });
    });
    document.querySelectorAll('.route-card, .quick-link, .service-card').forEach(surface => {
        const current = { x: 0, y: 0, angle: 0 };
        const velocity = { x: 0, y: 0, angle: 0 };
        const target = { x: 0, y: 0, angle: 0 };
        let frame = 0;
        const animate = () => {
            let moving = false;
            for (const axis of ['x', 'y', 'angle']) {
                velocity[axis] = (velocity[axis] + (target[axis] - current[axis]) * .16) * .74;
                current[axis] += velocity[axis];
                if (Math.abs(target[axis] - current[axis]) + Math.abs(velocity[axis]) > .025) moving = true;
            }
            surface.style.setProperty('--spring-x', `${current.x.toFixed(2)}px`);
            surface.style.setProperty('--spring-y', `${current.y.toFixed(2)}px`);
            surface.style.setProperty('--spring-angle', `${current.angle.toFixed(2)}deg`);
            if (moving) frame = window.requestAnimationFrame(animate);
            else frame = 0;
        };
        const wake = () => { if (!frame) frame = window.requestAnimationFrame(animate); };
        surface.addEventListener('pointermove', event => {
            const bounds = surface.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - .5;
            const y = (event.clientY - bounds.top) / bounds.height - .5;
            target.x = x * 7; target.y = y * 5; target.angle = x * 1.5;
            wake();
        });
        surface.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; target.angle = 0; wake(); });
    });
}
mobileMenu.addEventListener('click', () => {
    const expanded = mobileMenu.getAttribute('aria-expanded') === 'true';
    mobileMenu.setAttribute('aria-expanded', String(!expanded));
    mobileMenu.innerHTML = expanded ? '<i class="fa-solid fa-bars"></i>' : '<i class="fa-solid fa-xmark"></i>';
    mainNav.classList.toggle('open', !expanded);
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    mobileMenu.setAttribute('aria-expanded', 'false');
    mobileMenu.innerHTML = '<i class="fa-solid fa-bars"></i>';
}));

const requestedMode = routeParams.get('mode');
if (requestedMode && bookingModes[requestedMode]) setBookingMode(requestedMode);
if (routeParams.get('search') === '1' && requestedMode !== 'pnr' && requestedMode !== 'charts') {
    window.requestAnimationFrame(() => document.querySelector('#search-form').requestSubmit());
}
