(() => {
    const dateInput = document.querySelector('#lp-date');
    const fromInput = document.querySelector('#lp-from');
    const toInput = document.querySelector('#lp-to');
    const stationList = document.querySelector('#lp-stations');
    const localIsoDate = date => {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    };
    if (dateInput) {
        const today = localIsoDate(new Date());
        dateInput.min = today;
        dateInput.value = today;
        document.querySelectorAll('[data-lp-date-offset]').forEach(button => {
            button.addEventListener('click', () => {
                const date = new Date();
                date.setDate(date.getDate() + Number(button.dataset.lpDateOffset));
                dateInput.value = localIsoDate(date);
                document.querySelectorAll('[data-lp-date-offset]').forEach(item => {
                    const selected = item === button;
                    item.setAttribute('aria-pressed', String(selected));
                });
            });
        });
        dateInput.addEventListener('change', () => {
            const offset = Math.round((new Date(`${dateInput.value}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000);
            document.querySelectorAll('[data-lp-date-offset]').forEach(button => {
                button.setAttribute('aria-pressed', String(Number(button.dataset.lpDateOffset) === offset));
            });
        });

        const recentSection = document.querySelector('#lp-recent-searches');
        const recentList = document.querySelector('#lp-recent-list');
        const searchForm = document.querySelector('#quick-search');
        try {
            const recent = JSON.parse(localStorage.getItem('rail-demo-recent-searches') || '[]');
            const searches = Array.isArray(recent) ? recent.filter(item => item && typeof item.from === 'string' && typeof item.to === 'string' && typeof item.date === 'string' && typeof item.travelClass === 'string').slice(0, 3) : [];
            if (recentSection && recentList && searchForm && searches.length) {
                recentSection.hidden = false;
                searches.forEach(search => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'lp-recent-chip';
                    button.title = `${search.from} to ${search.to}`;
                    const route = document.createElement('strong');
                    route.textContent = `${search.from} → ${search.to}`;
                    const detail = document.createElement('small');
                    const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(search.date)
                        ? new Date(`${search.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : 'Date not set';
                    detail.textContent = `${dateLabel} · ${search.travelClass}`;
                    button.append(route, detail);
                    button.addEventListener('click', () => {
                        fromInput.value = search.from;
                        toInput.value = search.to;
                        dateInput.value = search.date >= today ? search.date : today;
                        const classInput = document.querySelector('#lp-class');
                        if ([...classInput.options].some(option => option.value === search.travelClass)) classInput.value = search.travelClass;
                        searchForm.requestSubmit();
                    });
                    recentList.append(button);
                });
            }
        } catch {
            // Recent journeys are optional; keep the search usable if browser storage is unavailable.
        }
    }
    document.querySelector('.lp-search-swap')?.addEventListener('click', () => {
        [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
        toInput.focus();
    });
    const tripIdeas = [
        { title: 'A weekend in Jaipur', from: 'New Delhi', fromCode: 'NDLS', to: 'Jaipur', toCode: 'JP', duration: 'Check current times' },
        { title: 'A day in Agra', from: 'New Delhi', fromCode: 'NDLS', to: 'Agra Cantt', toCode: 'AGC', duration: 'Check current times' },
        { title: 'Along the Ganges', from: 'New Delhi', fromCode: 'NDLS', to: 'Varanasi Junction', toCode: 'BSB', duration: 'Check current times' },
    ];
    let tripIdeaIndex = 0;
    const ideaFields = {
        title: document.querySelector('#lp-idea-title'),
        from: document.querySelector('#lp-idea-from'),
        fromCode: document.querySelector('#lp-idea-from-code'),
        to: document.querySelector('#lp-idea-to'),
        toCode: document.querySelector('#lp-idea-to-code'),
        duration: document.querySelector('#lp-idea-duration'),
    };
    const showTripIdea = index => {
        tripIdeaIndex = (index + tripIdeas.length) % tripIdeas.length;
        const idea = tripIdeas[tripIdeaIndex];
        Object.entries(ideaFields).forEach(([key, element]) => { if (element) element.textContent = idea[key]; });
    };
    document.querySelector('.lp-idea-shuffle')?.addEventListener('click', () => showTripIdea(tripIdeaIndex + 1));
    document.querySelector('#lp-idea-use')?.addEventListener('click', () => {
        const idea = tripIdeas[tripIdeaIndex];
        fromInput.value = idea.from;
        toInput.value = idea.to;
        document.querySelector('#quick-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toInput.focus({ preventScroll: true });
    });
    const checklistItems = [...document.querySelectorAll('[data-trip-check]')];
    const checklistProgress = document.querySelector('#lp-check-progress');
    const checklistKey = 'rail-demo-trip-checklist-v1';
    const refreshChecklist = () => {
        const complete = checklistItems.filter(item => item.checked).length;
        if (checklistProgress) checklistProgress.textContent = `${complete} of ${checklistItems.length} ready`;
    };
    try {
        const savedChecklist = JSON.parse(localStorage.getItem(checklistKey) || '{}');
        checklistItems.forEach(item => { item.checked = savedChecklist[item.dataset.tripCheck] === true; });
    } catch {
        // The checklist remains usable if browser storage is unavailable.
    }
    refreshChecklist();
    checklistItems.forEach(item => item.addEventListener('change', () => {
        const values = Object.fromEntries(checklistItems.map(check => [check.dataset.tripCheck, check.checked]));
        try { localStorage.setItem(checklistKey, JSON.stringify(values)); } catch { /* Keep the current checklist usable in memory. */ }
        refreshChecklist();
    }));
    document.querySelector('#lp-check-reset')?.addEventListener('click', () => {
        checklistItems.forEach(item => { item.checked = false; });
        try { localStorage.removeItem(checklistKey); } catch { /* Reset still applies to the current page. */ }
        refreshChecklist();
    });
    let stationRequest = 0;
    const refreshStationOptions = async query => {
        const request = ++stationRequest;
        try {
            const params = new URLSearchParams({ q: query, limit: '12' });
            const response = await fetch(`/api/stations?${params}`);
            if (!response.ok) return;
            const stations = await response.json();
            if (request !== stationRequest) return;
            stationList.replaceChildren(...stations.map(station => {
                const option = document.createElement('option');
                option.value = station.name;
                option.label = [station.code, station.zone, station.state].filter(Boolean).join(' · ');
                return option;
            }));
        } catch {
            stationList.replaceChildren();
        }
    };
    let stationSearchTimer;
    [fromInput, toInput].forEach(input => {
        input.addEventListener('focus', () => refreshStationOptions(input.value.trim()));
        input.addEventListener('input', () => {
            window.clearTimeout(stationSearchTimer);
            stationSearchTimer = window.setTimeout(() => refreshStationOptions(input.value.trim()), 140);
        });
    });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
        const hero = document.querySelector('.lp-hero');
        const heroCopy = document.querySelector('.lp-hero-copy');
        const heroVisual = document.querySelector('.lp-visual');
        if (hero) {
            const scene = { background: 0, copy: 0, visual: 0, velocity: { background: 0, copy: 0, visual: 0 }, target: { background: 0, copy: 0, visual: 0 } };
            let sceneFrame = 0;
            const setSceneTarget = () => {
                const progress = Math.min(520, Math.max(0, -hero.getBoundingClientRect().top));
                scene.target.background = progress * .12;
                scene.target.copy = progress * -.025;
                scene.target.visual = progress * -.045;
                if (!sceneFrame) sceneFrame = window.requestAnimationFrame(animateScene);
            };
            const animateScene = () => {
                let moving = false;
                for (const layer of ['background', 'copy', 'visual']) {
                    scene.velocity[layer] = (scene.velocity[layer] + (scene.target[layer] - scene[layer]) * .11) * .76;
                    scene[layer] += scene.velocity[layer];
                    if (Math.abs(scene.target[layer] - scene[layer]) + Math.abs(scene.velocity[layer]) > .02) moving = true;
                }
                hero.style.setProperty('--hero-background-y', `${scene.background.toFixed(2)}px`);
                heroCopy?.style.setProperty('--hero-copy-y', `${scene.copy.toFixed(2)}px`);
                heroVisual?.style.setProperty('--hero-visual-y', `${scene.visual.toFixed(2)}px`);
                if (moving) sceneFrame = window.requestAnimationFrame(animateScene);
                else sceneFrame = 0;
            };
            window.addEventListener('scroll', setSceneTarget, { passive: true });
            window.addEventListener('resize', setSceneTarget, { passive: true });
        }
    }
    if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.lp-route-card, .lp-search-card, .lp-destination, .lp-quick-tools > a').forEach(surface => {
            surface.addEventListener('pointermove', event => {
                const bounds = surface.getBoundingClientRect();
                surface.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
                surface.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
            });
        });
        const searchCard = document.querySelector('.lp-search-card');
        if (searchCard) {
            const tilt = { x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 };
            let tiltFrame = 0;
            const animateTilt = () => {
                tilt.vx = (tilt.vx + (tilt.targetX - tilt.x) * .12) * .72;
                tilt.vy = (tilt.vy + (tilt.targetY - tilt.y) * .12) * .72;
                tilt.x += tilt.vx;
                tilt.y += tilt.vy;
                searchCard.style.setProperty('--search-tilt-x', `${tilt.y.toFixed(2)}deg`);
                searchCard.style.setProperty('--search-tilt-y', `${tilt.x.toFixed(2)}deg`);
                if (Math.abs(tilt.targetX - tilt.x) + Math.abs(tilt.targetY - tilt.y) + Math.abs(tilt.vx) + Math.abs(tilt.vy) > .02) {
                    tiltFrame = window.requestAnimationFrame(animateTilt);
                } else {
                    tilt.x = tilt.targetX;
                    tilt.y = tilt.targetY;
                    tiltFrame = 0;
                }
            };
            const wakeTilt = () => { if (!tiltFrame) tiltFrame = window.requestAnimationFrame(animateTilt); };
            searchCard.addEventListener('pointermove', event => {
                const bounds = searchCard.getBoundingClientRect();
                tilt.targetX = ((event.clientX - bounds.left) / bounds.width - .5) * 2.4;
                tilt.targetY = ((event.clientY - bounds.top) / bounds.height - .5) * -2.4;
                wakeTilt();
            });
            searchCard.addEventListener('pointerleave', () => {
                tilt.targetX = 0;
                tilt.targetY = 0;
                wakeTilt();
            });
        }
        document.querySelectorAll('.lp-destination, .lp-quick-tools > a, .lp-steps article').forEach(surface => {
            const position = { x: 0, y: 0, angle: 0 };
            const velocity = { x: 0, y: 0, angle: 0 };
            const target = { x: 0, y: 0, angle: 0 };
            let frame = 0;
            const animate = () => {
                let moving = false;
                for (const axis of ['x', 'y', 'angle']) {
                    velocity[axis] = (velocity[axis] + (target[axis] - position[axis]) * .16) * .74;
                    position[axis] += velocity[axis];
                    if (Math.abs(target[axis] - position[axis]) + Math.abs(velocity[axis]) > .025) moving = true;
                }
                surface.style.setProperty('--spring-x', `${position.x.toFixed(2)}px`);
                surface.style.setProperty('--spring-y', `${position.y.toFixed(2)}px`);
                surface.style.setProperty('--spring-angle', `${position.angle.toFixed(2)}deg`);
                if (moving) frame = window.requestAnimationFrame(animate);
                else frame = 0;
            };
            const wake = () => { if (!frame) frame = window.requestAnimationFrame(animate); };
            surface.addEventListener('pointermove', event => {
                const bounds = surface.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - .5;
                const y = (event.clientY - bounds.top) / bounds.height - .5;
                target.x = x * 7;
                target.y = y * 5;
                target.angle = x * 1.5;
                wake();
            });
            surface.addEventListener('pointerleave', () => {
                target.x = 0; target.y = 0; target.angle = 0;
                wake();
            });
        });
    }
    if (reduceMotion) return;

    const revealItems = document.querySelectorAll('.lp-value-card, .lp-destination, .lp-steps article, .lp-last-cta');
    revealItems.forEach((item, index) => {
        item.classList.add('lp-reveal');
        item.style.setProperty('--reveal-delay', `${(index % 3) * 65}ms`);
    });
    document.documentElement.classList.add('motion-ready');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' });
        revealItems.forEach(item => observer.observe(item));
    } else {
        revealItems.forEach(item => item.classList.add('is-visible'));
    }

    const visual = document.querySelector('.lp-visual');
    const routeCard = document.querySelector('.lp-route-card');
    const floatingNote = document.querySelector('.lp-floating-note');
    if (!visual || !routeCard || !floatingNote || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0, vx: 0, vy: 0 };
    let animationFrame = 0;

    function animateSpring() {
        current.vx = (current.vx + (target.x - current.x) * 0.075) * 0.78;
        current.vy = (current.vy + (target.y - current.y) * 0.075) * 0.78;
        current.x += current.vx;
        current.y += current.vy;

        routeCard.style.setProperty('--parallax-x', `${current.x * 6}px`);
        routeCard.style.setProperty('--parallax-y', `${current.y * 5}px`);
        routeCard.style.setProperty('--tilt-x', `${current.y * -2.2}deg`);
        routeCard.style.setProperty('--tilt-y', `${current.x * 3}deg`);
        floatingNote.style.setProperty('--note-x', `${current.x * -8}px`);
        floatingNote.style.setProperty('--note-y', `${current.y * -6}px`);

        if (Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > 0.002 || Math.abs(current.vx) + Math.abs(current.vy) > 0.002) {
            animationFrame = window.requestAnimationFrame(animateSpring);
        } else {
            current.x = target.x;
            current.y = target.y;
            animationFrame = 0;
        }
    }

    function scheduleSpring() {
        if (!animationFrame) animationFrame = window.requestAnimationFrame(animateSpring);
    }

    visual.addEventListener('pointermove', event => {
        const bounds = visual.getBoundingClientRect();
        target.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        target.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        scheduleSpring();
    });
    visual.addEventListener('pointerleave', () => {
        target.x = 0;
        target.y = 0;
        scheduleSpring();
    });
})();
