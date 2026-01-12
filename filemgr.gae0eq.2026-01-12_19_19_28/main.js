// Global variables
let cart = JSON.parse(localStorage.getItem('cart')) || [];
// Per-config preview images (used in catalog + cart)
const CONFIG_IMAGES = {
    'launch-pad9-base': 'launch-pad9-base.webp',
    'launch-pad9-tablet': 'launch-pad9-tablet.webp',
    'launch-pad9-case': 'launch-pad9-case.webp'
};

const MUCAR_TABLET_ADDON_PRICE = 13000;
const PAD9_CONFIGS = {
    'launch-pad9-base': { label: 'Сканер + провод', price: 42000, image: CONFIG_IMAGES['launch-pad9-base'] },
    'launch-pad9-tablet': { label: 'Сканер + провод + планшет', price: 55000, image: CONFIG_IMAGES['launch-pad9-tablet'] },
    'launch-pad9-case': { label: 'Сканер + провод + планшет + кейс', price: 58000, image: CONFIG_IMAGES['launch-pad9-case'] }
};

let currentConfig = {
    // Default selected комплектации
    'launch-pad9': { id: 'launch-pad9-tablet', price: 55000, image: CONFIG_IMAGES['launch-pad9-tablet'] },
    'launch-hd': { id: 'launch-hd-base', price: 130000, image: 'product-launch-hd.webp' }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Prevent horizontal scrolling on mobile (and accidental layout overflow)
    try {
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
    } catch (e) {}

    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize animations
    initAnimations();
    
    // Initialize cart
    updateCartCount();
    
    // Initialize page-specific functionality
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initHomePage();
            break;
        case 'catalog':
            initCatalogPage();
            break;
        case 'cart':
            initCartPage();
            break;
        case 'contacts':
            initContactsPage();
            break;
        case 'product':
            initProductPage();
            break;
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('catalog.html')) return 'catalog';
    if (path.includes('cart.html')) return 'cart';
    if (path.includes('contacts.html')) return 'contacts';
    // Any product page like product-*.html
    if (path.includes('product-')) return 'product';
    return 'index';
}

// Mobile Menu functionality
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // -----------------------------
    // Mobile burger panel (animation is CSS-driven)
    // -----------------------------
    const fitMenuToViewport = () => {
        try {
            const nav = document.querySelector('nav.fixed.top-0') || document.querySelector('nav');
            const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 72;

            // Expose to CSS so panel sits under header
            document.documentElement.style.setProperty('--nav-h', navH + 'px');

            // Keep the panel positioned under the header (do NOT force full height)
            if (mobileMenu) {
                mobileMenu.style.top = navH + 'px';
            }

            const inner = mobileMenu ? mobileMenu.querySelector('.mobile-menu-inner') : null;
            if (!inner) return;

            // Keep content scrollable inside panel, but don't cover the whole screen
            const max = Math.max(
                240,
                Math.min(
                    520,
                    Math.floor(window.innerHeight - navH - 24)
                )
            );
            inner.style.maxHeight = max + 'px';
            inner.style.overflowY = 'auto';
            inner.style.webkitOverflowScrolling = 'touch';
        } catch (e) {}
    };

    const openMenu = () => {
        if (!mobileMenu) return;
        fitMenuToViewport();
        mobileMenu.classList.add('open');
        if (mobileOverlay) mobileOverlay.classList.add('active');
        document.body.classList.add('menu-open');
    };

    const closeMenu = () => {
        if (!mobileMenu) return;
        mobileMenu.classList.remove('open');
        // Reset any sizing tweaks (keep CSS-driven layout)
        try { mobileMenu.style.height = ''; } catch(e) {}
        try { mobileMenu.style.maxHeight = ''; } catch(e) {}
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');

        // Close mobile catalog submenu (if open)
        document.querySelectorAll('.mobile-catalog.open').forEach(el => {
            el.classList.remove('open');
            const toggle = el.querySelector('.mobile-catalog-toggle');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
    };

    if (mobileMenuBtn && mobileMenu) {
        // Ensure closed state on load
        mobileMenu.classList.remove('open');
        if (mobileOverlay) mobileOverlay.classList.remove('active');

        mobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (mobileMenu.classList.contains('open')) closeMenu();
            else openMenu();
        });

        // Close menu when clicking any link inside it (normal behavior)
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => closeMenu());
        });

        // Close menu when clicking outside (overlay)
        if (mobileOverlay) mobileOverlay.addEventListener('click', () => closeMenu());

        // Close menu on Escape
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
        });

        // When switching to desktop breakpoint, force-close
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768 && mobileMenu.classList.contains('open')) closeMenu();
            if (mobileMenu.classList.contains('open')) fitMenuToViewport();
        });
    }

    // -----------------------------
    // Mobile "Каталог" accordion inside burger menu (CSS grid animation)
    // -----------------------------
    document.querySelectorAll('.mobile-catalog-toggle').forEach(btn => {
        const wrapper = btn.closest('.mobile-catalog');
        if (!wrapper) return;

        // Ensure collapsed initially
        wrapper.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const willOpen = !wrapper.classList.contains('open');
            wrapper.classList.toggle('open', willOpen);
            btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });
    });

    // -----------------------------
    // Desktop dropdown (Каталог) — hover only, anti-auto-pop
    // -----------------------------
    const catalogLinks = document.querySelectorAll('a[href="catalog.html"]');
    if (!catalogLinks.length) return;

    let mouseMovedSinceLoad = false;
    window.addEventListener('mousemove', () => { mouseMovedSinceLoad = true; }, { once: true });

    const closeAllDropdowns = () => {
        document.querySelectorAll('.dropdown.active').forEach(dd => dd.classList.remove('active'));
    };
    document.addEventListener('click', closeAllDropdowns);
    window.addEventListener('resize', closeAllDropdowns);
    window.addEventListener('scroll', closeAllDropdowns, { passive: true });

    catalogLinks.forEach(link => {
        const wrapper = link.parentElement; // .relative.group
        const dropdown = wrapper ? wrapper.querySelector('.dropdown') : null;
        if (!wrapper || !dropdown) return;

        let closeTimer = null;
        const open = () => {
            if (closeTimer) clearTimeout(closeTimer);
            dropdown.classList.add('active');
        };
        const close = () => {
            if (closeTimer) clearTimeout(closeTimer);
            closeTimer = setTimeout(() => dropdown.classList.remove('active'), 120);
        };

        let prevInside = null;
        const isInside = (ev) => {
            const x = ev.clientX;
            const y = ev.clientY;
            const w = wrapper.getBoundingClientRect();
            const d = dropdown.getBoundingClientRect();
            const insideWrapper = x >= w.left && x <= w.right && y >= w.top && y <= w.bottom;
            const insideDropdown = x >= d.left && x <= d.right && y >= d.top && y <= d.bottom;
            return insideWrapper || insideDropdown;
        };

        const onDocMouseMove = (ev) => {
            if (window.innerWidth < 768) return;
            if (!mouseMovedSinceLoad) return;
            const inside = isInside(ev);
            if (prevInside === null) {
                prevInside = inside; // first move: just set baseline
                return;
            }
            if (prevInside === false && inside === true) open();
            if (prevInside === true && inside === false) close();
            prevInside = inside;
        };
        document.addEventListener('mousemove', onDocMouseMove);

        // Mobile top-nav dropdown (rare, but keep safe)
        link.addEventListener('click', (e) => {
            if (window.innerWidth >= 768) return;
            e.preventDefault();
            dropdown.classList.toggle('active');
        });

        dropdown.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => dropdown.classList.remove('active'));
        });

        wrapper.addEventListener('click', (e) => e.stopPropagation());
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    });
}

// Animations
function initAnimations() {
    // Fade in animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

// Home page initialization
function initHomePage() {
    // Initialize typed.js for hero text
    if (document.getElementById('typed-text')) {
        new Typed('#typed-text', {
            strings: ['диагностика автомобилей'],
            typeSpeed: 80,
            backSpeed: 50,
            backDelay: 2000,
            loop: false,
            showCursor: true,
            cursorChar: '|'
        });
    }

    // FAQ accordion on главной: one item at a time + smooth height animation
    initDetailsAccordion('.faq-details');
}

// -----------------------------
// <details> accordion helper (single-open + smooth)
// -----------------------------
function initDetailsAccordion(selector) {
    const detailsEls = Array.from(document.querySelectorAll(selector));
    if (!detailsEls.length) return;

    const isOpen = (d) => d.hasAttribute('open');

    const clearTimers = (d) => {
        if (d._faqTimer) {
            clearTimeout(d._faqTimer);
            d._faqTimer = null;
        }
    };

    const animateOpen = (d) => {
        const content = d.querySelector('.faq-content');
        if (!content) return;

        clearTimers(d);
        d.classList.remove('is-closing');

        // Ensure open so height can be measured
        d.setAttribute('open', '');

        // Reset to a known start state
        content.style.maxHeight = '0px';
        // Force reflow
        content.getBoundingClientRect();

        // Next frame expand to full height
        requestAnimationFrame(() => {
            const target = content.scrollHeight;
            content.style.maxHeight = target + 'px';
        });

        const finish = () => {
            // Keep a real pixel height so the accordion can be opened/closed repeatedly
            // ("none" can lead to stuck states on some browsers after a few toggles).
            content.style.maxHeight = content.scrollHeight + 'px';
        };

        const onEnd = (ev) => {
            if (ev.propertyName !== 'max-height') return;
            finish();
        };
        content.addEventListener('transitionend', onEnd, { once: true });

        // Fallback in case transitionend never fires (some browsers / interrupted animations)
        d._faqTimer = setTimeout(finish, 450);
    };

    const animateClose = (d) => {
        const content = d.querySelector('.faq-content');
        if (!content) return;

        clearTimers(d);
        d.classList.add('is-closing');

        // Freeze current height (works even if it was 'none')
        const start = content.scrollHeight;
        content.style.maxHeight = start + 'px';
        content.getBoundingClientRect();

        requestAnimationFrame(() => {
            content.style.maxHeight = '0px';
        });

        const finish = () => {
            d.removeAttribute('open');
            d.classList.remove('is-closing');
            // Keep it at 0 when closed
            content.style.maxHeight = '0px';
        };

        const onEnd = (ev) => {
            if (ev.propertyName !== 'max-height') return;
            finish();
        };
        content.addEventListener('transitionend', onEnd, { once: true });

        d._faqTimer = setTimeout(finish, 450);
    };

    // Initial state
    detailsEls.forEach(d => {
        const content = d.querySelector('.faq-content');
        if (!content) return;
        content.style.maxHeight = isOpen(d) ? (content.scrollHeight + 'px') : '0px';
        d.classList.remove('is-closing');
        clearTimers(d);
    });

    detailsEls.forEach(d => {
        const summary = d.querySelector('summary');
        if (!summary) return;

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const willOpen = !isOpen(d);

            // Close others (single-open accordion)
            detailsEls.forEach(other => {
                if (other !== d && isOpen(other)) animateClose(other);
            });

            if (willOpen) animateOpen(d);
            else animateClose(d);
        });
    });

    // Keep height correct on resize for opened items
    window.addEventListener('resize', () => {
        detailsEls.forEach(d => {
            if (!isOpen(d)) return;
            const content = d.querySelector('.faq-content');
            if (!content) return;
            content.style.maxHeight = content.scrollHeight + 'px';
        });
    });
}


// Catalog page initialization
function initCatalogPage() {
    // Bind catalog buttons (choose config / add direct)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const card = btn.closest('[data-product-id]');
        const productId = card ? card.getAttribute('data-product-id') : null;
        const action = btn.getAttribute('data-action');

        if (action === 'choose-config' && productId) {
            e.preventDefault();
            openConfigModal(productId);
        }

        if (action === 'add-direct' && productId) {
            e.preventDefault();
            // Универсальное добавление в корзину (без хардкода под конкретный товар)
            const name = (card?.querySelector('h3')?.textContent || '').trim() || productId;
            const price = parseInt(String(card?.dataset?.price || '').replace(/\D/g, ''), 10) || 0;
            const image = card?.querySelector('img')?.getAttribute('src') || 'logo.webp';

            // Special case: Mucar uses its own config logic (чтобы не ломать выбор планшета)
            if (productId === 'mucar-bt200') {
                addMucarToCart(false);
                return;
            }

            addToCart(productId, name, price, image);
        }
    });
}

// Product pages initialization
function initProductPage() {
    // Bind buttons on product pages (same data-action contract)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const productRoot = btn.closest('[data-product-id]');
        const productId = productRoot ? productRoot.getAttribute('data-product-id') : null;
        const action = btn.getAttribute('data-action');

        if (action === 'choose-config' && productId) {
            e.preventDefault();
            openConfigModal(productId);
        }

        if (action === 'add-direct' && productId) {
            e.preventDefault();
            const name = (productRoot?.querySelector('h1')?.textContent || '').trim() || productId;
            const priceText = (productRoot?.querySelector('.text-2xl.font-extrabold')?.textContent || '').trim();
            const price = parseInt(priceText.replace(/\D/g, ''), 10) || 0;
            const image = productRoot?.querySelector('img')?.getAttribute('src') || 'logo.webp';

            if (productId === 'mucar-bt200') {
                addMucarToCart(false);
                return;
            }

            addToCart(productId, name, price, image);
        }
    });
}

// -----------------------------
// Config modal (catalog + product pages)
// -----------------------------
let modalState = {
    productId: null,
    pad9Selected: 'launch-pad9-base',
    mucarWithTablet: false
};

function openConfigModal(productId) {
    const modal = document.getElementById('configModal');
    if (!modal) return;
    modalState.productId = productId;
    modalState.mucarWithTablet = false;
    modalState.pad9Selected = currentConfig['launch-pad9']?.id || 'launch-pad9-base';

    const title = document.getElementById('modalTitle');
    const subtitle = document.getElementById('modalSubtitle');
    const img = document.getElementById('modalImage');
    const thumbs = document.getElementById('modalThumbs');
    const options = document.getElementById('modalOptions');
    const priceEl = document.getElementById('modalPrice');

    // Reset
    if (thumbs) thumbs.innerHTML = '';
    if (options) options.innerHTML = '';

    if (productId === 'mucar-bt200') {
        if (title) title.textContent = 'Mucar BT200 Pro — комплектация';
        if (subtitle) subtitle.textContent = 'Выберите, нужен ли планшет с ПО.';
        const MUCAR_BASE_IMG = 'product-mucar-bt200.webp';
        const MUCAR_TABLET_IMG = 'pad.png';
        if (img) img.src = MUCAR_BASE_IMG;

        if (options) {
            options.innerHTML = `
              <label class="flex items-center gap-3 p-4 rounded-2xl bg-[#0F1216] border border-[#2A2F36]">
                <input id="mucarTabletChk" type="checkbox" class="accent-[#00C896]" />
                <div>
                  <div class="font-semibold text-white">Добавить планшет с ПО</div>
                  <div class="text-sm text-gray-400">+${MUCAR_TABLET_ADDON_PRICE.toLocaleString()} ₽</div>
                </div>
              </label>
            `;
        }

        // Thumb for tablet image
        if (thumbs) {
            thumbs.innerHTML = `
              <button class="w-16 h-16 rounded-xl bg-[#252930] border border-[#2A2F36] overflow-hidden" data-thumb="product-mucar-bt200.webp" title="Сканер">
                <img src="product-mucar-bt200.webp" class="w-full h-full object-contain" alt="Сканер">
              </button>
              <button class="w-16 h-16 rounded-xl bg-[#252930] border border-[#2A2F36] overflow-hidden" data-thumb="pad.png" title="Планшет">
                <img src="pad.png" class="w-full h-full object-contain" alt="Планшет">
              </button>
            `;
        }

        // Bind MUCAR thumbs click (switch preview)
        if (thumbs && img) {
            thumbs.querySelectorAll('button[data-thumb]').forEach((b) => {
                b.addEventListener('click', () => {
                    const src = b.getAttribute('data-thumb');
                    if (src) img.src = src;
                });
            });
        }

// Price
        const updateMucarPrice = () => {
            const chk = document.getElementById('mucarTabletChk');
            modalState.mucarWithTablet = !!(chk && chk.checked);
            if (img) img.src = modalState.mucarWithTablet ? MUCAR_TABLET_IMG : MUCAR_BASE_IMG;
            if (thumbs) {
                const btns = thumbs.querySelectorAll('button[data-thumb]');
                btns.forEach((b) => b.classList.remove('ring-2','ring-[#00C896]','border-[#00C896]'));
                const want = modalState.mucarWithTablet ? MUCAR_TABLET_IMG : MUCAR_BASE_IMG;
                const active = Array.from(btns).find((b) => b.getAttribute('data-thumb') === want);
                if (active) active.classList.add('ring-2','ring-[#00C896]','border-[#00C896]');
            }
            const total = 18000 + (modalState.mucarWithTablet ? MUCAR_TABLET_ADDON_PRICE : 0);
            if (priceEl) priceEl.textContent = `${total.toLocaleString()} ₽`;
        };
        updateMucarPrice();
        setTimeout(() => {
            const chk = document.getElementById('mucarTabletChk');
            if (chk) chk.addEventListener('change', updateMucarPrice);
        }, 0);
    }

    if (productId === 'launch-pad9') {
        if (title) title.textContent = 'Launch X431 PAD 9 — комплектация';
        if (subtitle) subtitle.textContent = 'Выберите набор: сканер / сканер+планшет / полный комплект.';

        const cfg = PAD9_CONFIGS[modalState.pad9Selected] || PAD9_CONFIGS['launch-pad9-base'];
        if (img) img.src = cfg.image;

        if (options) {
            options.innerHTML = Object.entries(PAD9_CONFIGS).map(([id, c]) => {
                const checked = id === modalState.pad9Selected ? 'checked' : '';
                return `
                  <label class="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1216] border border-[#2A2F36] hover:border-[#00C896] transition">
                    <input type="radio" name="pad9cfg" value="${id}" class="mt-1 accent-[#00C896]" ${checked} />
                    <div>
                      <div class="font-semibold text-white">${c.label}</div>
                      <div class="text-sm text-gray-400">${c.price.toLocaleString()} ₽</div>
                    </div>
                  </label>
                `;
            }).join('');
        }

        const updatePad9 = () => {
            const val = document.querySelector('input[name="pad9cfg"]:checked')?.value || 'launch-pad9-base';
            modalState.pad9Selected = val;
            const c = PAD9_CONFIGS[val];
            if (priceEl) priceEl.textContent = `${c.price.toLocaleString()} ₽`;
            if (img) img.src = c.image;
        };

        updatePad9();
        setTimeout(() => {
            document.querySelectorAll('input[name="pad9cfg"]').forEach(r => r.addEventListener('change', updatePad9));
        }, 0);

        // thumbs
        if (thumbs) {
            thumbs.innerHTML = Object.entries(PAD9_CONFIGS).map(([id, c]) => `
              <button class="w-16 h-16 rounded-xl bg-[#252930] border border-[#2A2F36] overflow-hidden" data-pad9-thumb="${id}" title="${c.label}">
                <img src="${c.image}" class="w-full h-full object-contain" alt="${c.label}">
              </button>
            `).join('');
            thumbs.querySelectorAll('button[data-pad9-thumb]').forEach(b => {
                b.addEventListener('click', () => {
                    modalState.pad9Selected = b.getAttribute('data-pad9-thumb');
                    const radio = document.querySelector(`input[name="pad9cfg"][value="${modalState.pad9Selected}"]`);
                    if (radio) radio.checked = true;
                    const c = PAD9_CONFIGS[modalState.pad9Selected];
                    if (img) img.src = c.image;
                    if (priceEl) priceEl.textContent = `${c.price.toLocaleString()} ₽`;
                });
            });
        }
    }

    // show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // close handlers
    modal.querySelectorAll('[data-action="close-modal"]').forEach(el => {
        el.addEventListener('click', closeConfigModal, { once: true });
    });

    // add handler
    const addBtn = document.getElementById('modalAddBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            if (modalState.productId === 'mucar-bt200') {
                addMucarToCart(modalState.mucarWithTablet);
            }
            if (modalState.productId === 'launch-pad9') {
                currentConfig['launch-pad9'] = { id: modalState.pad9Selected, price: PAD9_CONFIGS[modalState.pad9Selected].price, image: PAD9_CONFIGS[modalState.pad9Selected].image };
                addToCartWithConfig('launch-pad9');
            }
            closeConfigModal();
        };
    }
}

function closeConfigModal() {
    const modal = document.getElementById('configModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Cart page initialization
function initCartPage() {
    renderCartItems();
    updateCartSummary();
}

// Contacts page initialization

// ===== Phone helpers (RU) + basic anti-spam =====
function digitsOnly(v){ return (v || '').toString().replace(/\D+/g,''); }

function normalizeRuPhone(input){
    let d = digitsOnly(input);
    // 10 digits like 9XXXXXXXXX -> assume RU mobile and prefix 7
    if (d.length === 10 && d[0] === '9') d = '7' + d;
    // 11 digits starting with 8 -> replace with 7
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    // keep max 11
    if (d.length > 11) d = d.slice(0,11);
    return d;
}

function formatRuPhoneNoParens(input){
    const d = normalizeRuPhone(input);
    if (!d) return '';
    // allow full clear (avoid getting stuck with a lone +7)
    if (d === '7') return '';
    const p = d.slice(1); // up to 10 digits
    let out = '+7';
    if (p.length > 0) out += ' ' + p.slice(0,3);
    if (p.length > 3) out += ' ' + p.slice(3,6);
    if (p.length > 6) out += '-' + p.slice(6,8);
    if (p.length > 8) out += '-' + p.slice(8,10);
    return out;
}

function isSuspiciousPhone(d){
    // d is normalized digits (can be 10/11)
    if (!d) return true;
    const n = normalizeRuPhone(d);
    if (n.length !== 11 || n[0] !== '7') return true;
    // very obvious junk
    if (/^(\d)\1{10}$/.test(n)) return true; // all same digit
    if (/(0123456789|1234567890)/.test(n)) return true;
    return false;
}

function bindRuPhoneMask(input){
    if (!input) return;
    // avoid binding twice
    if (input.dataset.phoneBound === '1') return;
    input.dataset.phoneBound = '1';
    input.addEventListener('input', (e) => {
        const v = e.target.value;
        const formatted = formatRuPhoneNoParens(v);
        e.target.value = formatted;
    });
}

function bindFormAntispam(form){
    if (!form) return;
    if (form.dataset.antispamBound === '1') return;
    form.dataset.antispamBound = '1';
    form.dataset.formStart = String(Date.now());
}

function initContactsPage() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        bindFormAntispam(contactForm);
        // bind phone mask (no brackets)
        const phone = contactForm.querySelector('input[name="phone"]');
        bindRuPhoneMask(phone);
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
}

// Cart functionality
function addToCart(id, name, price, image) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: price,
            image: image,
            quantity: 1,
            config: null
        });
    }
    
    saveCart();
    updateCartCount();
    showAddToCartMessage(name);
}

function addMucarToCart(withTablet = false) {
    const basePrice = 18000;
    const totalPrice = basePrice + (withTablet ? MUCAR_TABLET_ADDON_PRICE : 0);
    const existingItem = cart.find(item => item.id === 'mucar-bt200');

    if (existingItem) {
        existingItem.quantity += 1;
        // If user explicitly adds with tablet, enable it
        if (withTablet) {
            existingItem.mucarTablet = true;
            existingItem.basePrice = basePrice;
            existingItem.price = basePrice + MUCAR_TABLET_ADDON_PRICE;
        }
    } else {
        cart.push({
            id: 'mucar-bt200',
            name: 'Mucar BT200 Pro',
            basePrice: basePrice,
            mucarTablet: !!withTablet,
            price: totalPrice,
            image: 'product-mucar-bt200.webp',
            quantity: 1,
            config: null
        });
    }

    saveCart();
    updateCartCount();
    showAddToCartMessage(withTablet ? 'Mucar BT200 Pro + планшет' : 'Mucar BT200 Pro');
}

// Toggle MUCAR tablet option inside the cart item (not a separate product)
function toggleMucarTabletInCart(enabled) {
    const item = cart.find(i => i.id === 'mucar-bt200');
    if (!item) return;
    const basePrice = item.basePrice || 18000;
    item.basePrice = basePrice;
    item.mucarTablet = !!enabled;
    item.price = basePrice + (item.mucarTablet ? MUCAR_TABLET_ADDON_PRICE : 0);
    saveCart();
    updateCartCount();
    if (getCurrentPage() === 'cart') {
        renderCartItems();
        updateCartSummary();
    }
}

function addToCartWithConfig(productId) {
    const config = currentConfig[productId];
    if (!config) return;

    if (productId === 'launch-pad9') {
        // Store PAD9 item id as the selected config id (launch-pad9-base/tablet/case)
        const existingItem = cart.find(item => item.id === config.id);
        const cfg = PAD9_CONFIGS[config.id] || { label: getConfigName(config.id), price: config.price, image: config.image };

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: config.id,
                name: 'Launch X431 PAD 9',
                configId: config.id,
                config: cfg.label,
                price: cfg.price,
                image: cfg.image || 'product-launch-pad9.webp',
                quantity: 1
            });
        }

        saveCart();
        updateCartCount();
        showAddToCartMessage('Launch X431 PAD 9');
        return;
    }

    // Other products (no in-cart config selector yet)
    if (productId === 'launch-hd') {
        addToCart('launch-hd', 'Launch X-431 HD', 130000, 'product-launch-hd.webp');
    }
}

function getConfigName(configId) {
    if (PAD9_CONFIGS[configId]) return PAD9_CONFIGS[configId].label;
    if (configId && configId.includes('tablet')) return 'С планшетом';
    if (configId && configId.includes('case')) return 'С планшетом и кейсом';
    if (configId && configId.includes('base')) return 'Без планшета';
    return null;
}


function hasMucarTabletAddon() {
    return cart.some(item => item.id === 'mucar-tablet-addon');
}

function toggleMucarTabletAddon() {
    const addonIndex = cart.findIndex(item => item.id === 'mucar-tablet-addon');
    if (addonIndex !== -1) {
        cart.splice(addonIndex, 1);
    } else {
        cart.push({
            id: 'mucar-tablet-addon',
            name: 'Планшет с ПО (Android)',
            price: 13000,
            image: 'launch-pad9-tablet.webp',
            quantity: 1,
            config: 'Для MUCAR'
        });
    }
    saveCart();
    updateCartCount();
    if (getCurrentPage() === 'cart') {
        renderCartItems();
        updateCartSummary();
    }
}

function updatePad9ConfigInCart(oldId, newId) {
    const item = cart.find(i => i.id === oldId);
    if (!item) return;
    const cfg = currentConfig['launch-pad9'];
    // Map newId to price & image
    let price = 42000;
    let image = CONFIG_IMAGES['launch-pad9-base'];
    if (newId.includes('tablet')) { price = 55000; image = CONFIG_IMAGES['launch-pad9-tablet']; }
    if (newId.includes('case')) { price = 58000; image = CONFIG_IMAGES['launch-pad9-case']; }
    item.id = newId;
    item.price = price;
    item.image = image;
    item.config = getConfigName(newId);
    saveCart();
    updateCartCount();
    renderCartItems();
    updateCartSummary();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartCount();
    if (getCurrentPage() === 'cart') {
        renderCartItems();
        updateCartSummary();
    }
}

function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            updateCartCount();
            if (getCurrentPage() === 'cart') {
                renderCartItems();
                updateCartSummary();
            }
        }
    }
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartCount();
    if (getCurrentPage() === 'cart') {
        renderCartItems();
        updateCartSummary();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.style.display = 'none';
        if (emptyCart) emptyCart.style.display = 'block';
        return;
    }
    
    const hasAddon = hasMucarTabletAddon();
    
    cartItemsContainer.style.display = 'block';
    if (emptyCart) emptyCart.style.display = 'none';
    
    cartItemsContainer.innerHTML = cart.map(item => {
        const isPad9 = item.id.startsWith('launch-pad9-');
        const pad9Select = isPad9 ? `
            <div class="mt-3">
                <label class="block text-sm text-gray-300 mb-1">Комплектация</label>
                <select class="w-full bg-[#2D343B] text-white rounded-lg px-3 py-2 border border-[#374151]"
                        onchange="updatePad9ConfigInCart('${item.id}', this.value)">
                    <option value="launch-pad9-base" ${item.id === 'launch-pad9-base' ? 'selected' : ''}>Сканер + провод — 42 000 ₽</option>
                    <option value="launch-pad9-tablet" ${item.id === 'launch-pad9-tablet' ? 'selected' : ''}>Сканер + провод + планшет — 55 000 ₽</option>
                    <option value="launch-pad9-case" ${item.id === 'launch-pad9-case' ? 'selected' : ''}>Сканер + провод + планшет + кейс — 58 000 ₽</option>
                </select>
            </div>
        ` : '';

        const mucarAddonControls = item.id === 'mucar-bt200' ? `
            <div class="mt-3">
                <label class="flex items-center gap-2 text-sm text-gray-200">
                    <input type="checkbox" class="accent-[#00C896]" ${item.mucarTablet ? 'checked' : ''} onchange="toggleMucarTabletInCart(this.checked)" />
                    <span>Планшет с ПО (+13 000 ₽)</span>
                </label>
                <p class="text-xs text-gray-400 mt-1">Опция добавляется внутри MUCAR и пересчитывает итоговую цену.</p>
            </div>
        ` : '';

        return `
        <div class="cart-item bg-[#252930] rounded-xl border border-[#374151] p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                <div class="w-20 h-20 bg-[#2D343B] rounded-lg flex items-center justify-center flex-shrink-0">
                    <img src="${item.image}" alt="${item.name}" class="max-w-full max-h-full object-contain">
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-white mb-1 break-words">${item.name}</h3>
                    ${item.config ? `<p class="text-sm text-[#00C896] mb-2">${item.config}</p>` : ''}
                    <p class="text-xl font-bold text-[#00C896]">${item.price.toLocaleString()} ₽</p>
                    ${pad9Select}
                    ${mucarAddonControls}
                </div>
                <div class="flex items-center justify-between sm:justify-end sm:gap-4">
                    <div class="flex items-center space-x-3">
                        <button onclick="updateQuantity('${item.id}', -1)" class="quantity-btn w-8 h-8 bg-[#2D343B] text-white rounded-full flex items-center justify-center hover:bg-[#00C896]">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                            </svg>
                        </button>
                        <span class="text-white font-semibold w-8 text-center">${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', 1)" class="quantity-btn w-8 h-8 bg-[#2D343B] text-white rounded-full flex items-center justify-center hover:bg-[#00C896]">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function updateCartSummary() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const totalItemsEl = document.getElementById('total-items');
    const totalPriceEl = document.getElementById('total-price');
    const finalPriceEl = document.getElementById('final-price');
    const orderSummaryEl = document.getElementById('order-summary');
    const checkoutBtn = document.getElementById('checkout-btn');
    const recommendations = document.getElementById('recommendations');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalPriceEl) totalPriceEl.textContent = `${totalPrice.toLocaleString()} ₽`;
    if (finalPriceEl) finalPriceEl.textContent = `${totalPrice.toLocaleString()} ₽`;

    // Показываем итоговую сумму, только когда корзина не пустая
    if (orderSummaryEl) {
        orderSummaryEl.style.display = cart.length > 0 ? 'block' : 'none';
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        if (cart.length === 0) {
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (recommendations) {
        recommendations.style.display = cart.length > 0 ? 'block' : 'none';
    }
}

function addRecommendation(id, name, price) {
    addToCart(id, name, price, 'product-accessory.webp');
    if (getCurrentPage() === 'cart') {
        renderCartItems();
        updateCartSummary();
    }
}

// Configuration selection
function selectConfig(element, configId, price) {
    // Remove selected class from siblings
    const siblings = element.parentElement.querySelectorAll('.config-option');
    siblings.forEach(sibling => {
        sibling.classList.remove('selected');
        sibling.setAttribute('aria-checked', 'false');
    });

    // Add selected class to clicked element
    element.classList.add('selected');
    element.setAttribute('aria-checked', 'true');

    // Update current config
    const parts = configId.split('-');
    const productId = parts[0] + '-' + parts[1]; // e.g. launch-pad9

    const nextImage = CONFIG_IMAGES[configId];
    currentConfig[productId] = { id: configId, price: price, image: nextImage };

    // Update product preview image (catalog)
    if (productId === 'launch-pad9' && nextImage) {
        const preview = document.getElementById('launch-pad9-image');
        if (preview) preview.src = nextImage;
    }
}

// Checkout functionality
function checkout() {
    if (cart.length === 0) return;
    
    const orderModal = document.getElementById('order-modal');
    if (orderModal) {
        orderModal.classList.remove('hidden');
        
        // Clear cart after showing modal
        setTimeout(() => {
            clearCart();
        }, 1000);
    }
}

function closeOrderModal() {
    const orderModal = document.getElementById('order-modal');
    if (orderModal) {
        orderModal.classList.add('hidden');
    }
}

// Contact form handling
function handleContactFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    // trigger native validation (required/select etc.)
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

    // basic anti-spam: honeypot + too-fast submit
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value && hp.value.trim().length > 0) return;

    const started = parseInt(form.dataset.formStart || '0', 10);
    if (started && Date.now() - started < 1200) {
        alert('Слишком быстро отправлено. Пожалуйста, заполните форму вручную.');
        return;
    }

    // phone validation (must be real RU format)
    const phoneInput = form.querySelector('input[name="phone"]');
    const phoneDigits = normalizeRuPhone(phoneInput ? phoneInput.value : '');
    if (isSuspiciousPhone(phoneDigits)) {
        alert('Введите реальный номер телефона в формате +7 999 999-99-99');
        return;
    }

    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Simulate form submission (local demo)
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const oldText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) submitBtn.textContent = 'Отправляем...';

    setTimeout(() => {
        showSuccessModal();
        form.reset();
        // re-arm antispam timer and keep phone empty (no brackets)
        bindFormAntispam(form);
        if (submitBtn) submitBtn.textContent = oldText || 'Отправить заявку';
    }, 600);
}

function showSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.classList.remove('hidden');
    }
}

function closeSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.classList.add('hidden');
    }
}

// Utility functions
function showAddToCartMessage(productName) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-24 right-6 bg-[#00C896] text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Добавлено: ${productName}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function showConsultationMessage() {
    const notification = document.createElement('div');
    notification.className = 'fixed top-24 right-6 bg-[#3B82F6] text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span>Свяжитесь с нами для консультации!</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Update price function for catalog page
function updatePrice() {
    // This function would be called when checkboxes are changed
    // Implementation depends on specific requirements
    console.log('Price updated');
}

// Global click handlers for elements that might not exist on all pages
document.addEventListener('click', function(e) {
    // Handle clicks on elements that might not exist
    if (e.target.matches('[onclick*="showConsultationMessage"]')) {
        showConsultationMessage();
    }
});

// Export functions for global access
window.addToCart = addToCart;
window.addToCartWithConfig = addToCartWithConfig;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.selectConfig = selectConfig;
window.checkout = checkout;
window.closeOrderModal = closeOrderModal;
window.closeSuccessModal = closeSuccessModal;
window.addRecommendation = addRecommendation;
window.updatePrice = updatePrice;
window.showConsultationMessage = showConsultationMessage;

/* ===== Step 2: Catalog config modal (no server) ===== */
(function() {
  function fmtRub(v) {
    try { return new Intl.NumberFormat('ru-RU').format(v) + ' ₽'; } catch(e) { return v + ' ₽'; }
  }

  function qs(id) { return document.getElementById(id); }

  function setupCatalogSearchAndSort() {
    const search = qs('searchInput');
    const sort = qs('sortSelect');
    const grid = qs('catalogGrid');
    if (!grid) return;

    const cards = () => Array.from(grid.querySelectorAll('article'));

    // ===== Smart search helpers (typos + RU/EN variants + numbers) =====
    const ru2enMap = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
      'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
      'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    };

    // Normalize for comparisons:
    // - keep digits ("431", "200"),
    // - remove punctuation/spaces,
    // - map "ё" -> "е"
    function norm(s) {
      return (s || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[\s\-_/\\.,;:()\[\]{}"'`~!@#$%^&*+=<>?№]/g, '');
    }

    function tokenize(s) {
      return (s || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .split(/[^a-z0-9а-я]+/i)
        .filter(Boolean)
        .slice(0, 20);
    }

    function ru2en(s) {
      return (s || '').toLowerCase().split('').map(ch => ru2enMap[ch] ?? ch).join('');
    }

    function levenshtein(a, b) {
      a = a || ''; b = b || '';
      const m = a.length, n = b.length;
      if (!m) return n;
      if (!n) return m;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[m][n];
    }

    function similarity(a, b) {
      a = norm(a); b = norm(b);
      if (!a && !b) return 1;
      const d = levenshtein(a, b);
      return 1 - d / Math.max(a.length, b.length, 1);
    }

    // Common aliases + frequent typos (RU/EN) used in search
    const alias = {
      // brands
      'launch': ['лаунч', 'лонч'],
      'лаунч': ['launch', 'лонч'],
      'mucar': ['мукар', 'мюкар', 'мусар', 'мукор', 'мкар'],
      'мукар': ['mucar', 'мюкар', 'мусар', 'мукор', 'мкар'],
      'mukor': ['mucar'],
      // models
      'x431': ['x-431', 'x 431', '431', 'икс431', 'икс 431'],
      '431': ['x431', 'x-431', 'икс431'],
      'pad9': ['pad 9', 'пад9', 'пад 9'],
      'пад9': ['pad9', 'pad 9'],
      'hd': ['хд', 'ашд', 'h d'],
      'хд': ['hd'],
      // bt200 / 200
      'bt200': ['200', 'бт200', 'бт 200'],
      '200': ['bt200', 'бт200'],
      'pro': ['про'],
      'про': ['pro'],
    };

    // Reverse alias lookup: any known variant -> canonical key
    const aliasReverse = (() => {
      const rev = Object.create(null);
      for (const k of Object.keys(alias)) {
        (alias[k] || []).forEach(v => { rev[String(v).toLowerCase()] = k; });
      }
      return rev;
    })();

    function expandToken(tok) {
      const t = (tok || '').toLowerCase();
      const out = new Set();
      const add = (x) => { if (x) out.add(norm(x)); };

      add(t);
      add(ru2en(t));

      // alias expansions (direct)
      (alias[t] || []).forEach(add);

      // alias expansions (reverse): e.g. "мусар" -> canonical "mucar"
      const canon = aliasReverse[t];
      if (canon) {
        add(canon);
        (alias[canon] || []).forEach(add);
      }

      // if token already looks like x431 variations
      if (t === 'x-431' || t === 'x431') {
        add('431');
      }

      return Array.from(out).filter(Boolean);
    }

    function tokenScore(qTok, tTokNorm) {
      if (!qTok || !tTokNorm) return 0;
      if (tTokNorm.includes(qTok) || qTok.includes(tTokNorm)) return 1;
      // prefix bonus for short tokens ("мкар" -> "мукар")
      if (qTok.length >= 3 && tTokNorm.startsWith(qTok.slice(0, 3))) return 0.88;
      return similarity(qTok, tTokNorm);
    }

    function smartScore(query, text) {
      const qTokens = tokenize(query);
      if (!qTokens.length) return 1;

      const tTokens = tokenize(text).map(norm);
      const tJoined = norm(text);

      // quick win: full query match after normalization/translit
      const qJoined = norm(query);
      if (qJoined && tJoined.includes(qJoined)) return 1;
      const qJoinedTr = norm(ru2en(query));
      if (qJoinedTr && tJoined.includes(qJoinedTr)) return 0.99;

      // For each query token, find best match among text tokens
      let sum = 0;
      let matched = 0;

      for (const rawTok of qTokens) {
        const variants = expandToken(rawTok);
        let bestTok = 0;

        for (const v of variants) {
          // bonus if variant is contained in whole joined text (handles "x431" etc.)
          if (tJoined.includes(v)) {
            bestTok = Math.max(bestTok, 1);
            continue;
          }
          for (const tTok of tTokens) {
            bestTok = Math.max(bestTok, tokenScore(v, tTok));
          }
        }

        sum += bestTok;
        if (bestTok >= 0.62) matched++;
      }

      const avg = sum / Math.max(qTokens.length, 1);
      const coverage = matched / Math.max(qTokens.length, 1);

      // encourage matches that cover most tokens
      return Math.max(avg, (avg * 0.65 + coverage * 0.35));
    }

    const ORIGINAL_ORDER = new Map();
    cards().forEach((c, idx) => ORIGINAL_ORDER.set(c, idx));
    const THRESHOLD = 0.52; // more forgiving for short/typo queries like "мкар 200" / "мусар про"

    function applySearchAndMaybeSort() {
      const value = (search?.value || '').trim();
      const list = cards();
      list.forEach(card => {
        const hay = card.getAttribute('data-search') || '';
        const name = card.querySelector('h3')?.textContent || '';
        const score = smartScore(value, `${name} ${hay}`);
        card.dataset.relevance = String(score);
        const ok = !value || score >= THRESHOLD;
        card.style.display = ok ? '' : 'none';
      });

      // Keep "relevance" meaningful: when there is a query, sort by score desc.
      const mode = sort?.value || 'relevance';
      if (mode === 'relevance') {
        const visible = list.filter(c => c.style.display !== 'none');
        if (value) {
          visible.sort((a, b) => Number(b.dataset.relevance || 0) - Number(a.dataset.relevance || 0));
        } else {
          visible.sort((a, b) => (ORIGINAL_ORDER.get(a) ?? 0) - (ORIGINAL_ORDER.get(b) ?? 0));
        }
        visible.forEach(el => grid.appendChild(el));
      }
    }

    if (search) {
      search.addEventListener('input', applySearchAndMaybeSort);
    }

    if (sort) {
      sort.addEventListener('change', () => {
        const mode = sort.value;
        const list = cards();
        list.sort((a, b) => {
          const pa = Number(a.getAttribute('data-price') || 0);
          const pb = Number(b.getAttribute('data-price') || 0);
          const na = (a.getAttribute('data-name') || '').toLowerCase();
          const nb = (b.getAttribute('data-name') || '').toLowerCase();
          if (mode === 'price-asc') return pa - pb;
          if (mode === 'price-desc') return pb - pa;
          if (mode === 'name') return na.localeCompare(nb, 'ru');
          // relevance
          const hasQuery = (search?.value || '').trim();
          if (hasQuery) return Number(b.dataset.relevance || 0) - Number(a.dataset.relevance || 0);
          return (ORIGINAL_ORDER.get(a) ?? 0) - (ORIGINAL_ORDER.get(b) ?? 0);
        });
        list.forEach(el => grid.appendChild(el));
      });
    }

    // init
    applySearchAndMaybeSort();
  }

  function setupConfigModal() {
    const modal = qs('configModal');
    if (!modal) return;

    const title = qs('modalTitle');
    const subtitle = qs('modalSubtitle');
    const img = qs('modalImage');
    const thumbs = qs('modalThumbs');
    const opts = qs('modalOptions');
    const priceEl = qs('modalPrice');
    const addBtn = qs('modalAddBtn');

    let state = { productId: null, mucarTablet: false, pad9ConfigId: 'launch-pad9-tablet' };

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      state.productId = null;
    }

    function open(productId) {
      state.productId = productId;

      modal.classList.remove('hidden');
      modal.classList.add('flex');

      // reset
      thumbs.innerHTML = '';
      opts.innerHTML = '';

      if (productId === 'mucar-bt200') {
        title.textContent = 'Mucar BT200 Pro';
        subtitle.textContent = 'Выберите комплектацию';
        state.mucarTablet = false;

        img.src = 'product-mucar-bt200.webp';
        img.alt = 'Mucar BT200 Pro';

        // thumbs (scanner + optional tablet)
        thumbs.innerHTML = `
          <div class="w-16 h-16 rounded-xl bg-[#15181C] border border-[#2A2F36] flex items-center justify-center overflow-hidden">
            <img src="product-mucar-bt200.webp" class="w-full h-full object-contain p-1" alt="Сканер">
          </div>
          <div id="thumbTablet" class="w-16 h-16 rounded-xl bg-[#15181C] border border-[#2A2F36] flex items-center justify-center overflow-hidden opacity-40">
            <img src="pad.png" class="w-full h-full object-contain p-1" alt="Планшет">
          </div>
        `;

        opts.innerHTML = `
          <label class="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1216] border border-[#2A2F36] cursor-pointer hover:border-[#00C896] transition">
            <input type="checkbox" id="mucarTabletOpt" class="mt-1 accent-[#00C896]" />
            <div>
              <div class="text-white font-semibold">Планшет с ПО (Android)</div>
              <div class="text-sm text-gray-400 mt-1">Добавить планшет в комплект (+${fmtRub(MUCAR_TABLET_ADDON_PRICE).replace(' ₽','')} ₽)</div>
            </div>
          </label>
        `;

        const cb = qs('mucarTabletOpt');
        cb.addEventListener('change', () => {
          state.mucarTablet = cb.checked;
          const th = qs('thumbTablet');
          if (th) th.classList.toggle('opacity-40', !state.mucarTablet);
          renderPrice();
        });

        renderPrice();
        addBtn.onclick = () => {
          addMucarToCart(state.mucarTablet);
          close();
        };
        return;
      }

      if (productId === 'launch-pad9') {
        title.textContent = 'Launch X431 PAD 9';
        subtitle.textContent = 'Выберите комплектацию';
        // default from currentConfig if exists
        const cur = currentConfig?.['launch-pad9']?.id || 'launch-pad9-tablet';
        state.pad9ConfigId = cur;

        function radio(id, label, price) {
          const checked = state.pad9ConfigId === id ? 'checked' : '';
          return `
            <label class="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1216] border border-[#2A2F36] cursor-pointer hover:border-[#00C896] transition">
              <input type="radio" name="pad9cfg" value="${id}" class="mt-1 accent-[#00C896]" ${checked}/>
              <div>
                <div class="text-white font-semibold">${label}</div>
                <div class="text-sm text-gray-400 mt-1">${fmtRub(price)}</div>
              </div>
            </label>
          `;
        }

        opts.innerHTML =
          radio('launch-pad9-base', 'Сканер + провод', 42000) +
          radio('launch-pad9-tablet', 'Сканер + провод + планшет', 55000) +
          radio('launch-pad9-case', 'Сканер + провод + планшет + кейс', 58000);

        function applyPad9Visual() {
          const cfg = PAD9_CONFIGS[state.pad9ConfigId];
          img.src = cfg.image;
          img.alt = cfg.label;
          thumbs.innerHTML = `
            <div class="w-16 h-16 rounded-xl bg-[#15181C] border border-[#2A2F36] flex items-center justify-center overflow-hidden">
              <img src="${CONFIG_IMAGES['launch-pad9-base']}" class="w-full h-full object-contain p-1" alt="Сканер">
            </div>
            <div class="w-16 h-16 rounded-xl bg-[#15181C] border border-[#2A2F36] flex items-center justify-center overflow-hidden ${state.pad9ConfigId==='launch-pad9-base'?'opacity-40':''}">
              <img src="${CONFIG_IMAGES['launch-pad9-tablet']}" class="w-full h-full object-contain p-1" alt="Планшет">
            </div>
            <div class="w-16 h-16 rounded-xl bg-[#15181C] border border-[#2A2F36] flex items-center justify-center overflow-hidden ${state.pad9ConfigId!=='launch-pad9-case'?'opacity-40':''}">
              <img src="${CONFIG_IMAGES['launch-pad9-case']}" class="w-full h-full object-contain p-1" alt="Кейс">
            </div>
          `;
          renderPrice();
        }

        opts.querySelectorAll('input[name="pad9cfg"]').forEach(r => {
          r.addEventListener('change', () => {
            state.pad9ConfigId = r.value;
            // update global config so cart page can edit later
            const cfg = PAD9_CONFIGS[state.pad9ConfigId];
            currentConfig['launch-pad9'] = { id: state.pad9ConfigId, price: cfg.price, image: cfg.image };
            applyPad9Visual();
          });
        });

        // initial render
        const cfg = PAD9_CONFIGS[state.pad9ConfigId];
        currentConfig['launch-pad9'] = { id: state.pad9ConfigId, price: cfg.price, image: cfg.image };
        applyPad9Visual();

        addBtn.onclick = () => {
          addToCartWithConfig('launch-pad9');
          close();
        };
        return;
      }

      if (productId === 'launch-hd') {
        title.textContent = 'Launch X-431 HD';
        subtitle.textContent = 'Профессиональная диагностика';
        img.src = 'product-launch-hd.webp';
        img.alt = 'Launch X-431 HD';
        thumbs.innerHTML = '';
        opts.innerHTML = `
          <div class="p-4 rounded-2xl bg-[#0F1216] border border-[#2A2F36] text-sm text-gray-300 leading-relaxed">
            Универсальное решение для диагностики легковых и грузовых автомобилей, автобусов и спецтехники.
          </div>
        `;
        priceEl.textContent = fmtRub(130000);
        addBtn.onclick = () => {
          addToCart('launch-hd', 'Launch X-431 HD', 130000, 'product-launch-hd.webp');
          close();
        };
        return;
      }
    }

    function renderPrice() {
      if (state.productId === 'mucar-bt200') {
        const total = 18000 + (state.mucarTablet ? MUCAR_TABLET_ADDON_PRICE : 0);
        priceEl.textContent = fmtRub(total);
        return;
      }
      if (state.productId === 'launch-pad9') {
        const cfg = PAD9_CONFIGS[state.pad9ConfigId];
        priceEl.textContent = fmtRub(cfg.price);
        return;
      }
    }

    // open triggers
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="choose-config"]');
      if (btn) {
        const card = btn.closest('article[data-product-id]');
        const productId = (card && card.getAttribute('data-product-id')) || btn.getAttribute('data-product-id');
        if (productId) open(productId);
      }
      const closeBtn = e.target.closest('[data-action="close-modal"]');
      if (closeBtn) close();
    });

    // ESC close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });
  }

  
  function injectUiFixes() {
    const css = `
      /* remove ugly tap highlight / flash */
      * { -webkit-tap-highlight-color: transparent; }
      a:active, button:active { outline: none; }
      a:focus, button:focus { outline: none; box-shadow: none; }
      a:focus-visible, button:focus-visible { outline: 2px solid #00C896; outline-offset: 2px; }
    
      /* mobile header: less chunky */
      @media (max-width: 520px){
        nav.fixed.top-0 > .max-w-6xl { padding-top: 8px !important; padding-bottom: 8px !important; }
        nav.fixed.top-0 img { width: 36px !important; height: 36px !important; }
        nav.fixed.top-0 .text-lg { font-size: 16px !important; }
        nav.fixed.top-0 .text-sm { font-size: 12px !important; }
      }

      /* mobile menu: keep bottom "Связаться" visible above safe-area */
      .mobile-menu-panel { padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
      @media (max-width: 520px){
        .mobile-menu-panel { margin-top: 8px !important; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
      }

      /* hero CTA buttons: prevent overflow on mobile (box-sizing + full width) */
      @media (max-width: 480px){
        .hero-bg .btn-primary,
        .hero-bg a.border-2{
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      }

      /* catalog grid 2-cols on narrow phones: make cards readable */
      @media (max-width: 380px){
        #catalogGrid.grid-cols-2{ gap: 12px !important; }
        #catalogGrid.grid-cols-2 article .p-5{ padding: 12px !important; }
        #catalogGrid.grid-cols-2 article h3{ font-size: 16px !important; line-height: 1.2 !important; }
        #catalogGrid.grid-cols-2 article p{ font-size: 12px !important; line-height: 1.35 !important; }
        #catalogGrid.grid-cols-2 article .text-2xl{ font-size: 18px !important; }
        #catalogGrid.grid-cols-2 article .mt-4.flex{ flex-direction: column !important; gap: 8px !important; }
        #catalogGrid.grid-cols-2 article .mt-4.flex > *{ width: 100% !important; }
      }
`;
    const style = document.createElement('style');
    style.setAttribute('data-ui-fixes', 'true');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function setupCatalogViewToggle() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    const buttons = Array.from(document.querySelectorAll('[data-action="set-catalog-cols"]'));
    if (!buttons.length) return;

    function apply(cols) {
      const c = String(cols);
      grid.classList.remove('grid-cols-1', 'grid-cols-2');
      grid.classList.add(c === '1' ? 'grid-cols-1' : 'grid-cols-2');
      localStorage.setItem('catalogCols', c);

      buttons.forEach((b) => {
        const active = b.getAttribute('data-cols') === c;
        b.classList.toggle('bg-[#252930]', active);
        b.classList.toggle('text-white', active);
      });
    }

    const saved = localStorage.getItem('catalogCols') || '2';
    apply(saved);

    buttons.forEach((b) => {
      b.addEventListener('click', () => apply(b.getAttribute('data-cols')));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectUiFixes();
    setupCatalogSearchAndSort();
    setupCatalogViewToggle();
    setupConfigModal();
  });
})();