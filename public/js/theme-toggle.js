(function () {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    const safeStorage = {
        async get() {
            try {
                // Use PreferencesService (works for authenticated and anonymous users)
                if (window.PreferencesService) {
                    return await window.PreferencesService.getTheme();
                }
                return null;
            } catch (error) {
                console.error('[ThemeToggle] Error getting theme:', error);
                return null;
            }
        },
        async set(value) {
            try {
                // Save to PreferencesService (works for authenticated and anonymous users)
                if (window.PreferencesService) {
                    await window.PreferencesService.setTheme(value);
                }
            } catch (error) {
                console.error('[ThemeToggle] Error setting theme:', error);
            }
        }
    };

    const normalizeTheme = (theme) => (theme === 'dark' ? 'dark' : 'light');

    const getInitialTheme = async () => {
        const stored = await safeStorage.get();
        if (stored && stored !== 'auto') {
            return normalizeTheme(stored);
        }
        return prefersDarkScheme.matches ? 'dark' : 'light';
    };

    const applyTheme = (theme, updateCookie = true) => {
        const normalized = normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', normalized);
        document.documentElement.classList.toggle('dark-mode', normalized === 'dark');
        document.documentElement.classList.toggle('light-mode', normalized !== 'dark');
        if (document.body) {
            document.body.classList.toggle('dark-mode', normalized === 'dark');
            document.body.classList.toggle('light-mode', normalized !== 'dark');
        }
        updateToggleButtons(normalized);

        // Update cookie for instant theme on next page load
        if (updateCookie) {
            document.cookie = 'austra_theme=' + normalized + '; path=/; max-age=31536000; SameSite=Lax';
        }

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

    let currentTheme = 'light';

    // Initialize theme asynchronously
    (async () => {
        currentTheme = await getInitialTheme();
        currentTheme = applyTheme(currentTheme);
    })();

    document.addEventListener('DOMContentLoaded', async () => {
        // Wait for initial theme and re-apply once body exists
        currentTheme = await getInitialTheme();
        currentTheme = applyTheme(currentTheme);

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.addEventListener('click', async () => {
                currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
                currentTheme = applyTheme(currentTheme);
                await safeStorage.set(currentTheme);
            });
        });
    });

    const handleSystemThemeChange = async (event) => {
        const stored = await safeStorage.get();
        if (stored && stored !== 'auto') {
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
