document.addEventListener('DOMContentLoaded', loadLinks);

async function loadLinks() {
    try {
        const response = await fetch('/api/links/mi');
        const data = await response.json();

        const linksList = document.getElementById('linksList');
        linksList.innerHTML = data.links.map(link => `
            <div class="link-item">
                <h3>${link.name}</h3>
                <p>${link.description}</p>
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
                           <button onclick="alert('Alerta Amber Uruguay\\n\\nFue creada por la Ley 20.381 (25/09/2024) y reglamentada por el Decreto 78/025 (12/03/2025). Es el protocolo nacional para activar la búsqueda inmediata de NNA desaparecidos.\\n\\nLa prensa oficial aclaró en septiembre de 2025 que aún faltaban convenios con telefónicas para el envío masivo de SMS/WhatsApp, pero el marco legal ya está vigente.\\n\\nMás información: https://www.impo.com.uy/bases/leyes/20381-2024');" class="btn btn-secondary">
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
                </div>
            </div>
        `).join('');

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
