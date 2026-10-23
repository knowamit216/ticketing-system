(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!reduceMotion && pointerFine) {
        document.querySelectorAll('.portal-card, .destination-detail-actions a, .more-destination-links a, .destination-route-pill').forEach(surface => {
            const physics = { x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0, targetX: 0, targetY: 0, targetAngle: 0 };
            let frame = 0;
            const animate = () => {
                physics.vx = (physics.vx + (physics.targetX - physics.x) * .14) * .7;
                physics.vy = (physics.vy + (physics.targetY - physics.y) * .14) * .7;
                physics.va = (physics.va + (physics.targetAngle - physics.angle) * .14) * .7;
                physics.x += physics.vx;
                physics.y += physics.vy;
                physics.angle += physics.va;

                surface.style.setProperty('--phys-x', `${physics.x.toFixed(2)}px`);
                surface.style.setProperty('--phys-y', `${physics.y.toFixed(2)}px`);
                surface.style.setProperty('--phys-angle', `${physics.angle.toFixed(2)}deg`);
                if (Math.abs(physics.targetX - physics.x) + Math.abs(physics.targetY - physics.y) + Math.abs(physics.targetAngle - physics.angle) + Math.abs(physics.vx) + Math.abs(physics.vy) + Math.abs(physics.va) > .025) {
                    frame = window.requestAnimationFrame(animate);
                } else {
                    physics.x = physics.targetX;
                    physics.y = physics.targetY;
                    physics.angle = physics.targetAngle;
                    frame = 0;
                }
            };
            const wake = () => { if (!frame) frame = window.requestAnimationFrame(animate); };
            surface.addEventListener('pointermove', event => {
                const bounds = surface.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - .5;
                const y = (event.clientY - bounds.top) / bounds.height - .5;
                physics.targetX = x * 3;
                physics.targetY = y * 2.5;
                physics.targetAngle = x * 1.1;
                surface.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
                surface.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
                wake();
            });
            surface.addEventListener('pointerleave', () => {
                physics.targetX = 0;
                physics.targetY = 0;
                physics.targetAngle = 0;
                wake();
            });
        });

        const revealItems = document.querySelectorAll('.portal-card, .portal-note, .destination-detail, .more-destination-links a');
        if (revealItems.length && 'IntersectionObserver' in window) {
            document.documentElement.classList.add('portal-motion-ready');
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('portal-visible');
                    observer.unobserve(entry.target);
                });
            }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
            revealItems.forEach((item, index) => {
                item.classList.add('portal-reveal');
                item.style.setProperty('--portal-delay', `${(index % 4) * 70}ms`);
                observer.observe(item);
            });
        }
    }
})();
