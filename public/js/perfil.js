        document.addEventListener('DOMContentLoaded', loadProfile);

        async function loadProfile() {
            try {
                const response = await fetch('/api/auth/profile');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar perfil');
                }

                displayProfile(data);
            } catch (error) {
                console.error('Error loading profile:', error);
                document.getElementById('userName').textContent = 'Error al cargar perfil';
            }
        }

        function displayProfile(data) {
            // Header info
            document.getElementById('userName').textContent = data.user.username || 'Usuario';
            document.getElementById('userEmail').textContent = data.user.email || '';
            document.getElementById('memberSince').textContent = new Date(data.user.createdAt).toLocaleDateString('es-UY');

            const roleText = data.user.role === 'admin' ? 'Administrador' : 'Usuario';
            document.getElementById('userRole').textContent = roleText;

            // Avatar emoji based on role
            const avatarEmoji = data.user.role === 'admin' ? '👨‍💼' : '👤';
            document.getElementById('userAvatar').textContent = avatarEmoji;

            // Subscription info
            const subscription = data.subscription || { plan: 'free' };
            const planNames = {
                'free': 'Free',
                'premium': 'Premium',
                'pro': 'Pro'
            };

            const subscriptionBadge = document.getElementById('userSubscription');
            subscriptionBadge.textContent = planNames[subscription.plan] || 'Free';
            subscriptionBadge.className = 'subscription-badge ' + subscription.plan;

            // Show upgrade section only for free users
            if (subscription.plan === 'free') {
                document.getElementById('upgradeSection').style.display = 'block';
            } else {
                document.getElementById('upgradeSection').style.display = 'none';
            }

            // Centinel Stats
            document.getElementById('totalReports').textContent = data.stats?.totalReports || 0;
            document.getElementById('totalValidations').textContent = data.stats?.totalValidations || 0;
            document.getElementById('reputationScore').textContent = data.stats?.reputation || 0;

            // Centinel Activity
            displayActivity(data.recentActivity || []);

            // Surlink Stats (placeholder - will be populated when Surlink backend is ready)
            document.getElementById('favoritesCount').textContent = data.surlink?.favorites?.length || 0;
            document.getElementById('commentsCount').textContent = data.surlink?.comments?.length || 0;
            document.getElementById('responsesCount').textContent = data.surlink?.responses?.length || 0;

            // Settings (if provided)
            if (data.settings) {
                document.getElementById('emailNotifications').checked = data.settings.emailNotifications || false;
                document.getElementById('publicProfile').checked = data.settings.publicProfile || false;
                document.getElementById('showLocation').checked = data.settings.showLocation || false;
            }

            // Check and display profile photo
            checkProfilePhoto(data);
        }

        function displayActivity(activities) {
            const container = document.getElementById('recentActivity');

            if (activities.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 1rem;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>No hay actividad reciente</p>
                        <p style="margin-top: 1rem;">
                            <a href="/centinel" class="btn btn-primary">Reportar un Incidente</a>
                        </p>
                    </div>
                `;
                return;
            }

            container.innerHTML = activities.map(activity => {
                const typeLabels = {
                    'report': 'Reportó un incidente',
                    'validation': 'Validó un reporte',
                    'comment': 'Comentó en un incidente'
                };

                return `
                    <div class="activity-item">
                        <div class="type">${typeLabels[activity.type] || activity.type}</div>
                        <div>${activity.description || ''}</div>
                        <div class="date">${new Date(activity.timestamp).toLocaleString('es-UY')}</div>
                    </div>
                `;
            }).join('');
        }

        // Modal functions
        async function openFavoritesModal() {
            document.getElementById('favoritesModal').classList.add('active');
            const content = document.getElementById('favoritesContent');

            // Show loading state
            content.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                        <path d="M12 2 A10 10 0 0 1 22 12" opacity="1"></path>
                    </svg>
                    <p>Cargando favoritos...</p>
                </div>
            `;

            try {
                const response = await fetch('/api/surlink/favorites');

                if (!response.ok) {
                    throw new Error('Error al cargar favoritos');
                }

                const data = await response.json();
                displayFavorites(data.favorites || []);
            } catch (error) {
                console.error('Error loading favorites:', error);
                content.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <p style="color: #dc3545;">Error al cargar favoritos</p>
                        <p style="font-size: 0.9rem;">Intenta nuevamente más tarde</p>
                    </div>
                `;
            }
        }

        async function openCommentsModal() {
            document.getElementById('commentsModal').classList.add('active');
            const content = document.getElementById('commentsContent');

            // Show loading state
            content.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                        <path d="M12 2 A10 10 0 0 1 22 12" opacity="1"></path>
                    </svg>
                    <p>Cargando comentarios...</p>
                </div>
            `;

            try {
                const response = await fetch('/api/surlink/comments');

                if (!response.ok) {
                    throw new Error('Error al cargar comentarios');
                }

                const data = await response.json();
                displayComments(data.comments || []);
            } catch (error) {
                console.error('Error loading comments:', error);
                content.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <p style="color: #dc3545;">Error al cargar comentarios</p>
                        <p style="font-size: 0.9rem;">Intenta nuevamente más tarde</p>
                    </div>
                `;
            }
        }

        async function openResponsesModal() {
            document.getElementById('responsesModal').classList.add('active');
            const content = document.getElementById('responsesContent');

            // Show loading state
            content.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                        <path d="M12 2 A10 10 0 0 1 22 12" opacity="1"></path>
                    </svg>
                    <p>Cargando respuestas...</p>
                </div>
            `;

            try {
                const response = await fetch('/api/surlink/responses');

                if (!response.ok) {
                    throw new Error('Error al cargar respuestas');
                }

                const data = await response.json();
                displayResponses(data.responses || []);
            } catch (error) {
                console.error('Error loading responses:', error);
                content.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <p style="color: #dc3545;">Error al cargar respuestas</p>
                        <p style="font-size: 0.9rem;">Intenta nuevamente más tarde</p>
                    </div>
                `;
            }
        }

        // Display functions for Surlink data
        function displayFavorites(favorites) {
            const content = document.getElementById('favoritesContent');

            if (favorites.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No tienes favoritos guardados</p>
                        <p style="font-size: 0.9rem;">Explora Surlink y guarda tus listados favoritos</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = favorites.map(fav => `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #fafafa; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.1rem;">${fav.title || 'Sin título'}</h4>
                            <p style="margin: 0; color: #666; font-size: 0.9rem;">${fav.category || 'General'}</p>
                        </div>
                        <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">
                            ${fav.type || 'Listado'}
                        </span>
                    </div>
                    ${fav.description ? `<p style="color: #555; margin-bottom: 1rem; font-size: 0.95rem;">${fav.description}</p>` : ''}
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        ${fav.price ? `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">💰 ${fav.price}</span>` : ''}
                        ${fav.location ? `<span style="background: #e3f2fd; color: #1565c0; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">📍 ${fav.location}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.75rem; justify-content: space-between; align-items: center; border-top: 1px solid #e0e0e0; padding-top: 1rem;">
                        <span style="color: #999; font-size: 0.85rem;">Guardado: ${new Date(fav.savedAt || Date.now()).toLocaleDateString('es-UY')}</span>
                        <div style="display: flex; gap: 0.5rem;">
                            <a href="${fav.url || '#'}" target="_blank" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem; text-decoration: none;">Ver Listado</a>
                            <button onclick="removeFavorite('${fav.id || fav._id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Eliminar</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function displayComments(comments) {
            const content = document.getElementById('commentsContent');

            if (comments.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No has realizado comentarios</p>
                        <p style="font-size: 0.9rem;">Comenta en listados de Surlink para compartir tu opinión</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = comments.map(comment => `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #fafafa;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1rem;">${comment.listingTitle || 'Listado sin título'}</h4>
                            <span style="color: #999; font-size: 0.85rem;">${new Date(comment.createdAt || Date.now()).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                    <p style="color: #555; margin-bottom: 1rem; line-height: 1.6; padding: 1rem; background: white; border-left: 3px solid #667eea; border-radius: 4px;">${comment.text || comment.content || ''}</p>
                    <div style="display: flex; gap: 1rem; align-items: center; border-top: 1px solid #e0e0e0; padding-top: 1rem;">
                        ${comment.likes ? `<span style="color: #666; font-size: 0.9rem;">👍 ${comment.likes} me gusta</span>` : ''}
                        ${comment.responses ? `<span style="color: #666; font-size: 0.9rem;">💬 ${comment.responses} respuestas</span>` : ''}
                        <a href="${comment.listingUrl || '#'}" target="_blank" style="color: #667eea; text-decoration: none; font-size: 0.9rem; margin-left: auto;">Ver listado →</a>
                    </div>
                </div>
            `).join('');
        }

        function displayResponses(responses) {
            const content = document.getElementById('responsesContent');

            if (responses.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No tienes respuestas</p>
                        <p style="font-size: 0.9rem;">Las respuestas a tus comentarios aparecerán aquí</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = responses.map(response => `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #fafafa;">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; flex-shrink: 0;">
                            ${response.author ? response.author.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <div>
                                    <strong style="color: #333; font-size: 0.95rem;">${response.author || 'Usuario'}</strong>
                                    <span style="color: #999; font-size: 0.85rem; margin-left: 0.5rem;">respondió a tu comentario</span>
                                </div>
                                <span style="color: #999; font-size: 0.85rem; white-space: nowrap;">${new Date(response.createdAt || Date.now()).toLocaleDateString('es-UY')}</span>
                            </div>
                            <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.75rem; font-style: italic; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;">"${response.yourComment || 'Tu comentario'}"</p>
                            <p style="color: #333; margin-bottom: 1rem; padding: 1rem; background: white; border-left: 3px solid #667eea; border-radius: 4px;">${response.text || response.content || ''}</p>
                            <a href="${response.listingUrl || '#'}" target="_blank" style="color: #667eea; text-decoration: none; font-size: 0.9rem;">Ver conversación →</a>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Remove favorite function
        async function removeFavorite(favoriteId) {
            if (!confirm('¿Eliminar este favorito?')) return;

            try {
                const response = await fetch(`/api/surlink/favorites/${favoriteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al eliminar favorito');
                }

                // Reload favorites
                openFavoritesModal();

                // Update counter
                const currentCount = parseInt(document.getElementById('favoritesCount').textContent);
                document.getElementById('favoritesCount').textContent = Math.max(0, currentCount - 1);
            } catch (error) {
                console.error('Error removing favorite:', error);
                alert('Error al eliminar el favorito');
            }
        }

        window.removeFavorite = removeFavorite;

        // Close modal handlers
        document.getElementById('closeFavoritesModal')?.addEventListener('click', () => {
            document.getElementById('favoritesModal').classList.remove('active');
        });

        document.getElementById('closeCommentsModal')?.addEventListener('click', () => {
            document.getElementById('commentsModal').classList.remove('active');
        });

        document.getElementById('closeResponsesModal')?.addEventListener('click', () => {
            document.getElementById('responsesModal').classList.remove('active');
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Settings change handlers
        document.getElementById('emailNotifications')?.addEventListener('change', saveSettings);
        document.getElementById('publicProfile')?.addEventListener('change', saveSettings);
        document.getElementById('showLocation')?.addEventListener('change', saveSettings);

        async function saveSettings() {
            const settings = {
                emailNotifications: document.getElementById('emailNotifications').checked,
                publicProfile: document.getElementById('publicProfile').checked,
                showLocation: document.getElementById('showLocation').checked
            };

            try {
                const response = await fetch('/api/auth/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                if (!response.ok) {
                    throw new Error('Error al guardar configuración');
                }

                console.log('Settings saved successfully');
            } catch (error) {
                console.error('Error saving settings:', error);
                alert('Error al guardar la configuración');
            }
        }

        // Delete Account Modal
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        const deleteAccountModal = document.getElementById('deleteAccountModal');
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteInput = document.getElementById('confirmDelete');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

        deleteAccountBtn?.addEventListener('click', () => {
            deleteAccountModal.classList.add('active');
            const username = document.getElementById('userName').textContent;
            document.getElementById('deleteUsername').textContent = username;
        });

        closeDeleteModal?.addEventListener('click', () => {
            deleteAccountModal.classList.remove('active');
            confirmDeleteInput.value = '';
            confirmDeleteBtn.disabled = true;
        });

        cancelDeleteBtn?.addEventListener('click', () => {
            deleteAccountModal.classList.remove('active');
            confirmDeleteInput.value = '';
            confirmDeleteBtn.disabled = true;
        });

        // Enable delete button only when "ELIMINAR" is typed
        confirmDeleteInput?.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            confirmDeleteBtn.disabled = value !== 'ELIMINAR';
        });

        // Handle account deletion
        confirmDeleteBtn?.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/delete-account', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al eliminar cuenta');
                }

                // Account deleted successfully
                alert('Tu cuenta ha sido eliminada exitosamente.');
                window.location.href = '/';
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Error al eliminar la cuenta: ' + error.message);
            }
        });

        // Close delete modal when clicking outside
        deleteAccountModal?.addEventListener('click', (e) => {
            if (e.target === deleteAccountModal) {
                deleteAccountModal.classList.remove('active');
                confirmDeleteInput.value = '';
                confirmDeleteBtn.disabled = true;
            }
        });

        // Profile Photo Management
        let selectedPhotoFile = null;

        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        const removePhotoBtn = document.getElementById('removePhotoBtn');
        const uploadPhotoModal = document.getElementById('uploadPhotoModal');
        const closeUploadPhotoModal = document.getElementById('closeUploadPhotoModal');
        const cancelUploadBtn = document.getElementById('cancelUploadBtn');
        const photoInput = document.getElementById('photoInput');
        const photoPreviewContainer = document.getElementById('photoPreviewContainer');
        const photoPreview = document.getElementById('photoPreview');
        const confirmUploadBtn = document.getElementById('confirmUploadBtn');

        // Open upload modal
        uploadPhotoBtn?.addEventListener('click', () => {
            uploadPhotoModal.classList.add('active');
        });

        // Close upload modal
        function closePhotoModal() {
            uploadPhotoModal.classList.remove('active');
            photoInput.value = '';
            photoPreviewContainer.style.display = 'none';
            confirmUploadBtn.disabled = true;
            selectedPhotoFile = null;
        }

        closeUploadPhotoModal?.addEventListener('click', closePhotoModal);
        cancelUploadBtn?.addEventListener('click', closePhotoModal);

        // Handle photo selection and preview
        photoInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];

            if (!file) {
                photoPreviewContainer.style.display = 'none';
                confirmUploadBtn.disabled = true;
                selectedPhotoFile = null;
                return;
            }

            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('La foto debe ser menor a 5MB');
                e.target.value = '';
                photoPreviewContainer.style.display = 'none';
                confirmUploadBtn.disabled = true;
                selectedPhotoFile = null;
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Formato no válido. Usa JPG, PNG o WEBP');
                e.target.value = '';
                photoPreviewContainer.style.display = 'none';
                confirmUploadBtn.disabled = true;
                selectedPhotoFile = null;
                return;
            }

            // Show preview
            selectedPhotoFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.src = e.target.result;
                photoPreviewContainer.style.display = 'block';
                confirmUploadBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        });

        // Upload photo
        confirmUploadBtn?.addEventListener('click', async () => {
            if (!selectedPhotoFile) return;

            const formData = new FormData();
            formData.append('photo', selectedPhotoFile);

            try {
                confirmUploadBtn.disabled = true;
                confirmUploadBtn.textContent = 'Subiendo...';

                const response = await fetch('/api/auth/upload-photo', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al subir foto');
                }

                const data = await response.json();

                // Update avatar in the page
                updateAvatar(data.photoUrl);

                // Show remove button
                removePhotoBtn.style.display = 'inline-block';

                // Close modal
                closePhotoModal();

                alert('Foto de perfil actualizada exitosamente');
            } catch (error) {
                console.error('Error uploading photo:', error);
                alert('Error al subir la foto: ' + error.message);
            } finally {
                confirmUploadBtn.disabled = false;
                confirmUploadBtn.textContent = 'Guardar Foto';
            }
        });

        // Remove photo
        removePhotoBtn?.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) {
                return;
            }

            try {
                const response = await fetch('/api/auth/remove-photo', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al eliminar foto');
                }

                // Reset avatar to default emoji
                const userRole = document.getElementById('userRole').textContent;
                const defaultEmoji = userRole === 'Administrador' ? '👨‍💼' : '👤';
                updateAvatar(null, defaultEmoji);

                // Hide remove button
                removePhotoBtn.style.display = 'none';

                alert('Foto de perfil eliminada exitosamente');
            } catch (error) {
                console.error('Error removing photo:', error);
                alert('Error al eliminar la foto: ' + error.message);
            }
        });

        // Function to update avatar display
        function updateAvatar(photoUrl, emoji = null) {
            const avatarContainer = document.getElementById('userAvatar');

            if (photoUrl) {
                // Show photo
                avatarContainer.innerHTML = `<img src="${photoUrl}" alt="Profile Photo">`;
            } else if (emoji) {
                // Show emoji
                avatarContainer.innerHTML = `<span class="profile-avatar-placeholder">${emoji}</span>`;
            }
        }

        // Close photo modal when clicking outside
        uploadPhotoModal?.addEventListener('click', (e) => {
            if (e.target === uploadPhotoModal) {
                closePhotoModal();
            }
        });

        // Initialize remove button visibility based on profile data
        function checkProfilePhoto(profileData) {
            if (profileData.user?.photoUrl) {
                removePhotoBtn.style.display = 'inline-block';
                updateAvatar(profileData.user.photoUrl);
            } else {
                removePhotoBtn.style.display = 'none';
            }
        }
