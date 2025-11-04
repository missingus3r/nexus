(function () {
    const STORAGE_KEY = 'vortex-theme';
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    const safeStorage = {
        get() {
            try {
                // Try PreferencesService first (for authenticated users)
                if (window.PreferencesService) {
                    return window.PreferencesService.getTheme();
                }
                // Fallback to localStorage for guests or if service not ready
                return localStorage.getItem(STORAGE_KEY);
            } catch (error) {
                return null;
            }
        },
        set(value) {
            try {
                // Save to PreferencesService if available
                if (window.PreferencesService) {
                    window.PreferencesService.setTheme(value);
                } else {
                    // Fallback to localStorage for guests
                    localStorage.setItem(STORAGE_KEY, value);
                }
            } catch (error) {
                // Ignore write errors (e.g., private mode)
            }
        }
    };

    const normalizeTheme = (theme) => (theme === 'dark' ? 'dark' : 'light');

    const getInitialTheme = () => {
        const stored = safeStorage.get();
        if (stored && stored !== 'auto') {
            return normalizeTheme(stored);
        }
        return prefersDarkScheme.matches ? 'dark' : 'light';
    };

    const applyTheme = (theme) => {
        const normalized = normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', normalized);
        document.documentElement.classList.toggle('dark-mode', normalized === 'dark');
        document.documentElement.classList.toggle('light-mode', normalized !== 'dark');
        if (document.body) {
            document.body.classList.toggle('dark-mode', normalized === 'dark');
            document.body.classList.toggle('light-mode', normalized !== 'dark');
        }
        updateToggleButtons(normalized);
        return normalized;
    };

    const updateToggleButtons = (theme) => {
        const toggles = document.querySelectorAll('[data-theme-toggle]');
        toggles.forEach((button) => {
            button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            button.setAttribute(
                'aria-label',
                theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
            );
            button.dataset.themeState = theme;
        });
    };

    let currentTheme = applyTheme(getInitialTheme());

    document.addEventListener('DOMContentLoaded', () => {
        // Re-apply once body exists to update body classes and buttons inside templates
        currentTheme = applyTheme(currentTheme);

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
                currentTheme = applyTheme(currentTheme);
                safeStorage.set(currentTheme);
            });
        });
    });

    const handleSystemThemeChange = (event) => {
        const stored = safeStorage.get();
        if (stored) {
            // User has an explicit preference, respect it
            return;
        }
        currentTheme = applyTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof prefersDarkScheme.addEventListener === 'function') {
        prefersDarkScheme.addEventListener('change', handleSystemThemeChange);
    } else if (typeof prefersDarkScheme.addListener === 'function') {
        prefersDarkScheme.addListener(handleSystemThemeChange);
    }
})();
