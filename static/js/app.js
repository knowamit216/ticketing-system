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
const plannerTicketsKey = 'amit-travel-planner-tickets-v1';
let activePlannerTicket = null;

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
    const svg = document.querySelector('#route-map-art');
    const valid = station => station?.latitude != null && station?.longitude != null && Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
    if (!valid(fromStation) || !valid(toStation)) {
        preview.hidden = true;
        return;
    }
    const project = station => ({
        x: 24 + Math.min(1, Math.max(0, (Number(station.longitude) - 68) / 30)) * 472,
        y: 12 + (1 - Math.min(1, Math.max(0, (Number(station.latitude) - 6) / 32))) * 146,
    });
    const start = project(fromStation);
    const end = project(toStation);
    const pathData = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} L${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    document.querySelector('#route-map-path').setAttribute('d', pathData);
    svg.querySelector('.route-map-train animateMotion').setAttribute('path', pathData);
    for (const [id, point] of [['start', start], ['end', end]]) {
        for (const suffix of ['', '-halo']) {
            const marker = document.querySelector(`#route-map-${id}${suffix}`);
            marker.setAttribute('cx', point.x.toFixed(1));
            marker.setAttribute('cy', point.y.toFixed(1));
        }
    }
    const radians = value => Number(value) * Math.PI / 180;
    const lat1 = radians(fromStation.latitude), lat2 = radians(toStation.latitude);
    const dLat = lat2 - lat1, dLon = radians(toStation.longitude - fromStation.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const distance = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    document.querySelector('#map-from-name').textContent = `${fromStation.name}${fromStation.code ? ` · ${fromStation.code}` : ''}`;
    document.querySelector('#map-to-name').textContent = `${toStation.name}${toStation.code ? ` · ${toStation.code}` : ''}`;
    document.querySelector('#map-distance').textContent = `About ${distance.toLocaleString('en-IN')} km apart`;
    svg.setAttribute('aria-label', `Schematic map connecting ${fromStation.name} and ${toStation.name}`);
    preview.hidden = false;
}

function journeyDayLabel(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const sampleTrains = [
    { name: 'Intercity Express', number: '12001', depart: '06:10', arrive: '13:20', duration: '7h 10m', minutes: 430, fares: { SL: 520, '3A': 1190, '2A': 1680, '1A': 0, CC: 890 }, seats: { SL: 32, '3A': 12, '2A': 4, '1A': 0, CC: 18 } },
    { name: 'Superfast Express', number: '12905', depart: '08:35', arrive: '16:20', duration: '7h 45m', minutes: 465, fares: { SL: 560, '3A': 1340, '2A': 1890, '1A': 3150, CC: 960 }, seats: { SL: 0, '3A': 8, '2A': 8, '1A': 2, CC: 0 } },
    { name: 'Overnight Mail Express', number: '12215', depart: '21:15', arrive: '05:50', duration: '8h 35m', minutes: 515, fares: { SL: 490, '3A': 1090, '2A': 1530, '1A': 2790, CC: 0 }, seats: { SL: 24, '3A': 6, '2A': 0, '1A': 1, CC: 0 } },
];
let currentResults = [];
let currentRoute = null;
let selectedJourney = null;

function selectedClassCode() {
    const value = document.querySelector('#travel-class').value;
    return ({ 'All classes': '3A', 'Sleeper': 'SL', 'AC 3 Tier': '3A', 'AC 2 Tier': '2A', 'AC First Class': '1A', 'Chair Car': 'CC' })[value] || '3A';
}

function trainsForRoute(from, to) {
    // These are deliberately synthetic timetables. Give each route its own
    // plausible looking service set while keeping the same clearly labelled demo data.
    const routeSeed = [...`${codeFor(from)}${codeFor(to)}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const labels = ['Day Intercity Express', 'Superfast Express', 'Overnight Mail'];
    const cityLabel = to.replace(/ Junction| Central| Cantt| City/g, '');
    const durationFactor = 0.78 + (routeSeed % 45) / 100;
    return sampleTrains.map((train, index) => {
        const minutes = Math.round(train.minutes * durationFactor / 5) * 5;
        const departureMinutes = (Number(train.depart.slice(0, 2)) * 60 + Number(train.depart.slice(3)) + routeSeed % 110 + index * 17) % 1440;
        const arrivalMinutes = (departureMinutes + minutes) % 1440;
        const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
        const hours = Math.floor(minutes / 60);
        return {
            ...train,
            name: `${cityLabel} ${labels[index]}`,
            number: String(Number(train.number) + (routeSeed % 380) + index * 2),
            depart: clock(departureMinutes),
            arrive: clock(arrivalMinutes),
            minutes,
            duration: `${hours}h ${String(minutes % 60).padStart(2, '0')}m`,
            fares: Object.fromEntries(Object.entries(train.fares).map(([code, fare]) => [code, fare ? Math.round(fare * durationFactor / 10) * 10 : 0])),
        };
    });
}

function renderTrainResults() {
    if (!currentRoute) return;
    const sortBy = document.querySelector('#results-sort').value;
    const onlyAvailable = document.querySelector('#available-filter').checked;
    const classCode = selectedClassCode();
    const trains = currentResults.filter(train => !onlyAvailable || (train.seats[classCode] || 0) > 0);
    trains.sort((a, b) => sortBy === 'duration' ? a.minutes - b.minutes : sortBy === 'fare' ? (a.fares[classCode] || Infinity) - (b.fares[classCode] || Infinity) : a.depart.localeCompare(b.depart));
    const container = document.querySelector('#train-results');
    container.replaceChildren();
    document.querySelector('#results-count').textContent = `${trains.length} trains shown`;
    if (!trains.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-results';
        empty.textContent = 'No sample trains match this class and filter. Try another class or turn off the seat filter.';
        container.append(empty);
        return;
    }
    trains.forEach(train => {
        const seats = train.seats[classCode] || 0;
        const fare = train.fares[classCode];
        const card = document.createElement('article');
        card.className = 'train-card';
        card.innerHTML = `<div class="train-identity"><div class="train-name"></div><div class="train-number"></div><span class="demo-train-tag">SAMPLE DATA</span></div>
            <div class="train-times"><span>${train.depart}<small class="station-from"></small></span><i class="train-track"></i><span>${train.arrive}<small class="station-to"></small></span><span class="train-duration">${train.duration}<small>journey</small></span></div>
            <div class="availability ${seats ? '' : 'sold-out'}">${seats ? `AVAILABLE ${seats}` : 'NOT AVAILABLE'}<small>${classCode} · sample status</small></div>
            <div class="train-price"><strong>${fare ? `₹${fare.toLocaleString('en-IN')}` : '—'}</strong><small>${fare ? 'sample fare' : 'class unavailable'}</small></div>
            <button class="select-seat" type="button">Select</button>`;
        card.querySelector('.train-name').textContent = train.name;
        card.querySelector('.train-number').textContent = `${train.number} · Runs daily (demo)`;
        card.querySelector('.station-from').textContent = currentRoute.from;
        card.querySelector('.station-to').textContent = currentRoute.to;
        card.querySelector('.select-seat').addEventListener('click', () => showTrainDetails(train, currentRoute.from, currentRoute.to, currentRoute.date, classCode));
        container.append(card);
    });
}

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
}

document.querySelectorAll('[data-booking-tab]').forEach(tab => {
    tab.addEventListener('click', () => setBookingMode(tab.dataset.bookingTab));
});
document.querySelectorAll('[data-service-tab]').forEach(link => {
    link.addEventListener('click', () => setBookingMode(link.dataset.serviceTab));
});

document.querySelector('#pnr-form').addEventListener('submit', event => {
    event.preventDefault();
    const feedback = document.querySelector('#pnr-feedback');
    feedback.replaceChildren();
    const url = 'https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en';
    const result = document.createElement('div');
    result.className = 'sample-status-card';
    result.innerHTML = '<span class="status-pill">OFFICIAL INDIAN RAILWAYS</span><strong>Live PNR enquiry</strong><small>Enter your PNR on the official page to view its current status.</small>';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open official PNR enquiry';
    feedback.append(result, link);
    window.open(url, '_blank', 'noopener,noreferrer');
    feedback.hidden = false;
});

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
    window.open(url, '_blank', 'noopener,noreferrer');
    feedback.hidden = false;
});

function showTrainDetails(train, from, to, journeyDate, classCode) {
    selectedJourney = { train, from, to, journeyDate, classCode };
    document.querySelector('#details-title').textContent = train.name;
    document.querySelector('#details-subtitle').textContent = `${train.number} · ${from} → ${to} · ${prettyDate(journeyDate)}`;
    document.querySelector('#details-departure').textContent = train.depart;
    document.querySelector('#details-arrival').textContent = train.arrive;
    document.querySelector('#details-duration').textContent = train.duration;
    const seats = train.seats[classCode] || 0;
    const fare = train.fares[classCode];
    const classLabel = document.querySelector('#travel-class').value === 'All classes' ? `${classCode} · AC 3 Tier sample` : `${classCode} · ${document.querySelector('#travel-class').selectedOptions[0].textContent}`;
    document.querySelector('#booking-preview').innerHTML = `<div class="preview-class"><span>${classLabel}</span><strong>${fare ? `₹${fare.toLocaleString('en-IN')}` : 'Unavailable'}</strong></div><p>${seats ? `${seats} sample seats shown as available` : 'No sample seats shown for this class'}</p>${fare ? `<div class="preview-passengers"><label for="passenger-count">Passengers</label><select id="passenger-count"><option value="1">1 passenger</option><option value="2">2 passengers</option><option value="3">3 passengers</option><option value="4">4 passengers</option><option value="5">5 passengers</option><option value="6">6 passengers</option></select></div><div class="preview-total"><span>Estimated total <small>(sample fare)</small></span><strong id="preview-total">₹${fare.toLocaleString('en-IN')}</strong></div>` : ''}`;
    const passengerCount = document.querySelector('#passenger-count');
    if (fare && passengerCount) passengerCount.addEventListener('change', () => { document.querySelector('#preview-total').textContent = `₹${(fare * Number(passengerCount.value)).toLocaleString('en-IN')}`; });
    document.querySelector('#train-details-dialog').showModal();
}

document.querySelector('#review-journey').addEventListener('click', () => {
    if (!selectedJourney) return;
    const { train, from, to, journeyDate, classCode } = selectedJourney;
    const passengers = Number(document.querySelector('#passenger-count')?.value || 1);
    selectedJourney.passengers = passengers;
    const fare = train.fares[classCode];
    document.querySelector('#review-from').textContent = `${from} · ${codeFor(from)}`;
    document.querySelector('#review-to').textContent = `${to} · ${codeFor(to)}`;
    document.querySelector('#review-departure').textContent = train.depart;
    document.querySelector('#review-arrival').textContent = train.arrive;
    document.querySelector('#review-duration').textContent = train.duration;
    const arrivalDate = new Date(`${journeyDate}T12:00:00`);
    if (train.arrive <= train.depart) arrivalDate.setDate(arrivalDate.getDate() + 1);
    document.querySelector('#review-depart-date').textContent = journeyDayLabel(journeyDate);
    document.querySelector('#review-arrive-date').textContent = journeyDayLabel(localIsoDate(arrivalDate));
    document.querySelector('#review-train').textContent = `${train.name} · ${train.number}`;
    document.querySelector('#review-class').textContent = `${classCode} · ${passengers} passenger${passengers > 1 ? 's' : ''}`;
    document.querySelector('#review-quota').textContent = document.querySelector('#quota').value;
    document.querySelector('#review-fare').textContent = fare ? `₹${(fare * passengers).toLocaleString('en-IN')} · sample` : 'Unavailable';
    document.querySelector('#train-details-dialog').close();
    document.querySelector('#review-dialog').showModal();
});

function createPlannerTicket() {
    if (!selectedJourney) return;
    const { train, from, to, journeyDate, classCode, passengers = 1 } = selectedJourney;
    const fare = train.fares[classCode];
    if (!fare) return showToast('There is no sample fare for this class. Choose another class to continue.');
    const arrivalDate = new Date(`${journeyDate}T12:00:00`);
    if (train.arrive <= train.depart) arrivalDate.setDate(arrivalDate.getDate() + 1);
    const referenceDate = new Date();
    const datePart = localIsoDate(referenceDate).replaceAll('-', '');
    const randomPart = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replaceAll('-', '').slice(0, 7).toUpperCase();
    activePlannerTicket = {
        reference: `AKTP-${datePart}-${randomPart}`,
        from: `${from} (${codeFor(from)})`,
        to: `${to} (${codeFor(to)})`,
        departure: train.depart,
        arrival: train.arrive,
        departDate: journeyDayLabel(journeyDate),
        arriveDate: journeyDayLabel(localIsoDate(arrivalDate)),
        train: `${train.name} · ${train.number}`,
        travelClass: `${classCode} · ${passengers} passenger${passengers > 1 ? 's' : ''}`,
        travelDate: prettyDate(journeyDate),
        fare: `₹${(fare * passengers).toLocaleString('en-IN')} · estimated sample fare`,
        duration: train.duration,
        createdAt: referenceDate.toISOString(),
    };
    for (const [id, value] of Object.entries({
        'ticket-reference': activePlannerTicket.reference,
        'ticket-from': activePlannerTicket.from,
        'ticket-to': activePlannerTicket.to,
        'ticket-departure': activePlannerTicket.departure,
        'ticket-arrival': activePlannerTicket.arrival,
        'ticket-depart-date': activePlannerTicket.departDate,
        'ticket-arrive-date': activePlannerTicket.arriveDate,
        'ticket-train': activePlannerTicket.train,
        'ticket-class': activePlannerTicket.travelClass,
        'ticket-date': activePlannerTicket.travelDate,
        'ticket-fare': activePlannerTicket.fare,
    })) document.getElementById(id).textContent = value;

    try {
        const saved = JSON.parse(localStorage.getItem(plannerTicketsKey) || '[]');
        const tickets = Array.isArray(saved) ? saved : [];
        localStorage.setItem(plannerTicketsKey, JSON.stringify([activePlannerTicket, ...tickets].slice(0, 10)));
    } catch { /* The in-app ticket still works if browser storage is disabled. */ }
    document.querySelector('#review-dialog').close();
    document.querySelector('#ticket-dialog').showModal();
});

document.querySelector('#create-planner-ticket').addEventListener('click', createPlannerTicket);
document.querySelector('#download-planner-ticket').addEventListener('click', () => {
    if (!activePlannerTicket) return;
    const ticket = activePlannerTicket;
    const contents = [
        'AMIT KHATRI TRAVEL PLANNER — ITINERARY COPY',
        `Reference: ${ticket.reference}`,
        `Train: ${ticket.train}`,
        `From: ${ticket.from} at ${ticket.departure} (${ticket.departDate})`,
        `To: ${ticket.to} at ${ticket.arrival} (${ticket.arriveDate})`,
        `Travel date: ${ticket.travelDate}`,
        `Class and passengers: ${ticket.travelClass}`,
        `Estimated total: ${ticket.fare}`,
        `Journey duration: ${ticket.duration}`,
        '',
        'This planner copy does not book a train or reserve a seat.',
    ].join('\n');
    const file = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticket.reference}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.querySelector('#edit-journey').addEventListener('click', () => {
    if (!selectedJourney) return;
    const { train, from, to, journeyDate, classCode, passengers = 1 } = selectedJourney;
    document.querySelector('#review-dialog').close();
    showTrainDetails(train, from, to, journeyDate, classCode);
    const passengerCount = document.querySelector('#passenger-count');
    if (passengerCount) {
        passengerCount.value = String(passengers);
        passengerCount.dispatchEvent(new Event('change'));
    }
});

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
    updateRouteMap(fromStation, toStation);
    currentResults = trainsForRoute(from, to);
    currentRoute = { from, to, date: dateInput.value };
    const travelClass = document.querySelector('#travel-class').value;
    const recentSearches = [{ from, to, date: dateInput.value, travelClass }, ...readRecentSearches().filter(item => !(item.from === from && item.to === to && item.travelClass === travelClass))].slice(0, 4);
    try { localStorage.setItem(recentSearchesKey, JSON.stringify(recentSearches)); } catch { /* Search still works when storage is unavailable. */ }
    renderRecentSearches();
    renderTrainResults();
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#results-sort').addEventListener('change', renderTrainResults);
document.querySelector('#available-filter').addEventListener('change', event => {
    document.querySelector('#available-berth').checked = event.target.checked;
    renderTrainResults();
});
document.querySelector('#travel-class').addEventListener('change', () => { if (currentRoute) renderTrainResults(); });
document.querySelector('#available-berth').addEventListener('change', event => {
    document.querySelector('#available-filter').checked = event.target.checked;
    if (currentRoute) renderTrainResults();
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

document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
});
document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
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
