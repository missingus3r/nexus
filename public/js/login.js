        let auth0Client = null;

        // Auth0 configuration
        const AUTH0_CONFIG = {
            domain: '<%= process.env.AUTH0_DOMAIN %>',
            clientId: '<%= process.env.AUTH0_CLIENT_ID %>',
            authorizationParams: {
                redirect_uri: window.location.origin + '/login',
                prompt: 'login'
            }
        };

        async function initAuth0() {
            try {
                // Validate Auth0 configuration
                if (!AUTH0_CONFIG.domain || !AUTH0_CONFIG.clientId ||
                    AUTH0_CONFIG.domain === '' || AUTH0_CONFIG.domain.includes('your-domain')) {
                    throw new Error('Auth0 no está configurado. Por favor configura AUTH0_DOMAIN y AUTH0_CLIENT_ID en las variables de entorno.');
                }

                // Create Auth0 client
                auth0Client = await window.auth0.createAuth0Client(AUTH0_CONFIG);

                // Check if we're returning from Auth0
                const query = window.location.search;
                if (query.includes('code=') && query.includes('state=')) {
                    // Handle the redirect callback
                    await handleAuth0Callback();
                }
            } catch (error) {
                console.error('Error initializing Auth0:', error);
                showError('Error al inicializar autenticación: ' + error.message);
                throw error;
            }
        }

        async function handleAuth0Callback() {
            try {
                // Get the authorization code
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (!code) {
                    throw new Error('No authorization code found');
                }

                // Send code to our backend
                const response = await fetch('/api/auth/auth0/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code,
                        redirect_uri: AUTH0_CONFIG.authorizationParams.redirect_uri
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Save JWT token
                    if (data.token) {
                        localStorage.setItem('jwt', data.token);
                        console.log('JWT token saved');
                    }

                    // Show success message
                    toastSuccess(data.message || 'Autenticación exitosa');

                    // Redirect based on role
                    if (data.user && data.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/centinel';
                    }
                } else {
                    throw new Error(data.error || 'Error al procesar autenticación');
                }
            } catch (error) {
                console.error('Error in Auth0 callback:', error);
                toastError('Error al iniciar sesión: ' + error.message);
                // Clear URL parameters
                window.history.replaceState({}, document.title, '/login');
            }
        }

        async function loginWithAuth0() {
            try {
                if (!auth0Client) {
                    throw new Error('Cliente de autenticación no inicializado');
                }

                // Disable button during redirect
                const btn = document.getElementById('loginBtn');
                btn.disabled = true;
                btn.textContent = 'Redirigiendo...';

                // Redirect to Auth0 Universal Login
                await auth0Client.loginWithRedirect({
                    authorizationParams: {
                        redirect_uri: AUTH0_CONFIG.authorizationParams.redirect_uri,
                        scope: 'openid profile email',
                        prompt: 'login'
                    }
                });
            } catch (error) {
                console.error('Error logging in with Auth0:', error);
                showError('Error al iniciar sesión: ' + error.message);

                // Re-enable button
                const btn = document.getElementById('loginBtn');
                btn.disabled = false;
                btn.textContent = 'Iniciar Sesión / Registrar';
            }
        }

        function showError(message) {
            // Show error in a user-friendly way
            const loginContainer = document.querySelector('.login-container');

            // Remove existing error if any
            const existingError = document.getElementById('auth-error');
            if (existingError) {
                existingError.remove();
            }

            // Create error element
            const errorDiv = document.createElement('div');
            errorDiv.id = 'auth-error';
            errorDiv.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center;';
            errorDiv.textContent = message;

            // Insert before the button
            const btn = document.getElementById('loginBtn');
            btn.parentElement.insertBefore(errorDiv, btn);
        }

        // Track scroll position
        let scrollPosition = 0;

        // Anonymous modal functions
        function openAnonymousModal() {
            const modal = document.getElementById('anonymousModal');

            // Lock body scroll
            scrollPosition = window.pageYOffset;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollPosition}px`;
            document.body.style.width = '100%';

            modal.style.display = 'flex';
        }

        function closeAnonymousModal() {
            const modal = document.getElementById('anonymousModal');

            // Unlock body scroll
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('top');
            document.body.style.removeProperty('width');
            window.scrollTo(0, scrollPosition);

            modal.style.display = 'none';
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', async () => {
            // Close modal when clicking outside (on the wrapper or modal background)
            const anonymousModal = document.getElementById('anonymousModal');
            if (anonymousModal) {
                anonymousModal.addEventListener('click', function(event) {
                    // Close if clicking directly on the modal overlay, not on modal-content
                    if (event.target === this) {
                        closeAnonymousModal();
                    }
                });
            }

            // Close modal with ESC key
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    const modal = document.getElementById('anonymousModal');
                    if (modal && modal.style.display === 'flex') {
                        closeAnonymousModal();
                    }
                }
            });
            try {
                await initAuth0();

                // Set up login button
                document.getElementById('loginBtn').addEventListener('click', loginWithAuth0);

                // Set up anonymous button
                document.getElementById('anonymousBtn').addEventListener('click', openAnonymousModal);
            } catch (error) {
                // Disable login button if Auth0 failed to initialize
                const btn = document.getElementById('loginBtn');
                btn.disabled = true;
                btn.textContent = 'Autenticación no disponible';
            }
        });

        // Hamburger menu functionality
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.hero-nav .nav-links');

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinks.classList.toggle('active');
            });

            // Close menu when clicking on a link
            const links = document.querySelectorAll('.hero-nav .nav-links a');
            links.forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.hero-nav') && navLinks.classList.contains('active')) {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                }
            });
        }
