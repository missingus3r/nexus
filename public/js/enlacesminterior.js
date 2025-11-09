document.addEventListener('DOMContentLoaded', loadLinks);

async function loadLinks() {
    try {
        const response = await fetch('/enlacesminterior/mi');
        const data = await response.json();

        const linksList = document.getElementById('linksList');
        linksList.innerHTML = data.links.map(link => {
            // Extract domain from URL for favicon
            let domain = '';
            try {
                const url = new URL(link.url);
                domain = url.hostname;
            } catch (e) {
                domain = 'gub.uy';
            }

            return `
            <div class="link-item">
                <div style="display: flex; align-items: start; gap: 1rem; margin-bottom: 1rem;">
                    <div class="link-favicon" style="flex-shrink: 0;">
                        <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64"
                             alt="${link.name}"
                             style="width: 48px; height: 48px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23667eea%22 stroke-width=%222%22%3E%3Cpath d=%22M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71%22%3E%3C/path%3E%3Cpath d=%22M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71%22%3E%3C/path%3E%3C/svg%3E'">
                    </div>
                    <div style="flex: 1;">
                        <h3 style="margin-top: 0;">${link.name}</h3>
                        <p>${link.description}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${link.name === 'Personas Condenadas'
                        ? `<button onclick="openLinksModal('${link.url}', '${link.name}')" class="btn btn-primary">
                            Visitar &rarr;
                           </button>`
                        : `<a href="${link.url}" target="_blank" class="btn btn-primary">
                            Visitar &rarr;
                           </a>`
                    }
                    ${link.name === 'Emergencia 9-1-1'
                        ? `<a href="https://www.gub.uy/ministerio-interior/sites/ministerio-interior/files/2023-09/App%20Emergencia%209-1-1%202MB.pdf" target="_blank" class="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Manual de Usuario
                           </a>`
                        : ''
                    }
                    ${link.name === 'Personas Ausentes'
                        ? `<a href="https://personasausentes.minterior.gub.uy/es/articulos/como-actuar-ante-la-ausencia-de-un-familiar" target="_blank" class="btn btn-secondary">
                            Cómo Actuar
                           </a>
                           <a href="https://www.gub.uy/ministerio-interior/tramites-y-servicios/servicios/personas-ausentes" target="_blank" class="btn btn-secondary">
                            D.R.B.P.A.
                           </a>
                           <button onclick="toastInfo('Alerta Amber Uruguay\\n\\nFue creada por la Ley 20.381 (25/09/2024) y reglamentada por el Decreto 78/025 (12/03/2025). Es el protocolo nacional para activar la búsqueda inmediata de NNA desaparecidos.\\n\\nLa prensa oficial aclaró en septiembre de 2025 que aún faltaban convenios con telefónicas para el envío masivo de SMS/WhatsApp, pero el marco legal ya está vigente.\\n\\nMás información: https://www.impo.com.uy/bases/leyes/20381-2024', 8000);" class="btn btn-secondary">
                            Alerta Amber Uruguay
                           </button>
                           <a href="https://www.argentina.gob.ar/seguridad/alertasofia" target="_blank" class="btn btn-secondary">
                            Alerta Sofía Argentina
                           </a>
                           <a href="https://amberalertbrasil.mj.gov.br/" target="_blank" class="btn btn-secondary">
                            Amber Alert Brasil
                           </a>`
                        : ''
                    }
                    ${link.name === 'Denuncia Acoso Sexual en Transporte Público'
                        ? `<a href="https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/protocolodeactuacionantesituacionesdeacososexualeneltransportepublico.pdf" target="_blank" class="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Protocolo de Actuación
                           </a>
                           <a href="https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/protocoloparachoferes.pdf" target="_blank" class="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Protocolo para Choferes
                           </a>
                           <a href="https://montevideo.gub.uy/app/sur/ingreso/pages/ingresoClausula.xhtml" target="_blank" class="btn btn-primary" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                            Iniciar Denuncia Online
                           </a>`
                        : ''
                    }
                    ${link.name === 'Estadísticas de Criminalidad - AECA'
                        ? `<a href="https://observatorioseguridad.minterior.gub.uy/pentaho/api/repos/:public:observatorio:MININT_Observatorio.wcdf/generatedContent" target="_blank" class="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="9" y1="21" x2="9" y2="9"></line>
                            </svg>
                            Observatorio de Seguridad
                           </a>`
                        : ''
                    }
                </div>
            </div>
        `;
        }).join('');

        linksList.innerHTML += `
            <div class="mt-4">
                <p><em>${data.disclaimer}</em></p>
            </div>
        `;
    } catch (error) {
        console.error('Error loading links:', error);
        document.getElementById('linksList').innerHTML = '<p class="text-center">Error al cargar enlaces</p>';
    }
}

function openLinksModal(url, title) {
    const modal = document.getElementById('linksModal');
    const iframe = document.getElementById('linksModalIframe');
    const modalTitle = document.getElementById('linksModalTitle');

    modalTitle.textContent = title;
    iframe.src = url;
    modal.style.display = 'flex';

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeLinksModal() {
    const modal = document.getElementById('linksModal');
    const iframe = document.getElementById('linksModalIframe');

    modal.style.display = 'none';
    iframe.src = '';

    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Close modal on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeLinksModal();
    }
});
