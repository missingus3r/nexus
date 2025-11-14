// Forum Polls - Handles poll creation and voting

let pollOptions = ['', '']; // Start with 2 empty options
let pollType = 'discussion'; // 'discussion' or 'poll'

// Initialize poll functionality
function initPollCreation() {
  const threadTypeRadios = document.querySelectorAll('input[name="threadType"]');
  const pollCreationSection = document.getElementById('pollCreationSection');

  if (!threadTypeRadios.length || !pollCreationSection) return;

  threadTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      pollType = e.target.value;
      if (pollType === 'poll') {
        pollCreationSection.style.display = 'block';
        renderPollOptions();
      } else {
        pollCreationSection.style.display = 'none';
      }
    });
  });
}

// Render poll options UI
function renderPollOptions() {
  const container = document.getElementById('pollOptionsContainer');
  if (!container) return;

  container.innerHTML = pollOptions.map((option, index) => `
    <div class="poll-option-input" data-index="${index}">
      <input
        type="text"
        class="form-input"
        placeholder="Opción ${index + 1}"
        value="${escapeHtml(option)}"
        maxlength="200"
        oninput="updatePollOption(${index}, this.value)"
      >
      ${pollOptions.length > 2 ? `
        <button type="button" class="btn-icon btn-danger" onclick="removePollOption(${index})" title="Eliminar opción">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ` : ''}
    </div>
  `).join('');

  // Update add button state
  const addBtn = document.getElementById('addPollOptionBtn');
  if (addBtn) {
    addBtn.disabled = pollOptions.length >= 10;
    addBtn.textContent = pollOptions.length >= 10 ? 'Máximo 10 opciones' : '+ Agregar opción';
  }
}

// Update poll option value
function updatePollOption(index, value) {
  pollOptions[index] = value;
}

// Add new poll option
function addPollOption() {
  if (pollOptions.length >= 10) {
    toastWarning('Máximo 10 opciones permitidas');
    return;
  }

  pollOptions.push('');
  renderPollOptions();
}

// Remove poll option
function removePollOption(index) {
  if (pollOptions.length <= 2) {
    toastWarning('Mínimo 2 opciones requeridas');
    return;
  }

  pollOptions.splice(index, 1);
  renderPollOptions();
}

// Get poll data for submission
function getPollData() {
  if (pollType !== 'poll') return null;

  // Filter out empty options
  const validOptions = pollOptions.filter(opt => opt.trim().length > 0);

  if (validOptions.length < 2) {
    toastWarning('La encuesta debe tener al menos 2 opciones');
    return null;
  }

  const expiresAt = document.getElementById('pollExpiresAt')?.value;
  const allowMultiple = document.getElementById('pollAllowMultiple')?.checked || false;

  return {
    options: validOptions.map(text => ({ text: text.trim() })),
    expiresAt: expiresAt || null,
    allowMultiple
  };
}

// Reset poll creation form
function resetPollCreation() {
  pollOptions = ['', ''];
  pollType = 'discussion';

  const discussionRadio = document.querySelector('input[name="threadType"][value="discussion"]');
  if (discussionRadio) {
    discussionRadio.checked = true;
  }

  const pollCreationSection = document.getElementById('pollCreationSection');
  if (pollCreationSection) {
    pollCreationSection.style.display = 'none';
  }

  const expiresInput = document.getElementById('pollExpiresAt');
  if (expiresInput) {
    expiresInput.value = '';
  }

  const allowMultipleInput = document.getElementById('pollAllowMultiple');
  if (allowMultipleInput) {
    allowMultipleInput.checked = false;
  }
}

// Render poll in thread view
function renderPoll(poll, userVotes = [], threadId) {
  if (!poll || !poll.options) return '';

  const totalVotes = poll.totalVotes || 0;
  const hasExpired = poll.expiresAt && new Date(poll.expiresAt) <= new Date();
  const hasVoted = userVotes && userVotes.length > 0;

  let html = `
    <div class="poll-container" data-thread-id="${threadId}">
      <div class="poll-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="16" rx="2"></rect>
          <path d="M7 10h4M7 14h8M17 10v4"></path>
        </svg>
        <h4>Encuesta</h4>
        ${hasExpired ? '<span class="poll-expired-badge">Expirada</span>' : ''}
      </div>

      ${poll.expiresAt ? `
        <div class="poll-expiration">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${hasExpired ?
            `Expiró el ${formatDate(poll.expiresAt)}` :
            `Expira el ${formatDate(poll.expiresAt)}`
          }
        </div>
      ` : ''}

      <div class="poll-options">
        ${poll.options.map(option => {
          const percentage = totalVotes > 0 ? ((option.votesCount / totalVotes) * 100).toFixed(1) : 0;
          const isSelected = userVotes && userVotes.includes(option.id);

          return `
            <div class="poll-option ${isSelected ? 'selected' : ''}" data-option-id="${option.id}">
              ${!hasVoted && !hasExpired ? `
                <input
                  type="${poll.allowMultiple ? 'checkbox' : 'radio'}"
                  name="poll-vote-${threadId}"
                  value="${option.id}"
                  ${isSelected ? 'checked' : ''}
                  onchange="handlePollVoteChange('${threadId}', '${option.id}')"
                >
              ` : ''}

              <div class="poll-option-content">
                <div class="poll-option-text">${escapeHtml(option.text)}</div>
                <div class="poll-option-bar">
                  <div class="poll-option-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="poll-option-stats">
                  <span>${option.votesCount || 0} votos</span>
                  <span>${percentage}%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="poll-footer">
        <div class="poll-total-votes">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          ${totalVotes} ${totalVotes === 1 ? 'voto' : 'votos'}
        </div>

        ${!hasVoted && !hasExpired ? `
          <button class="btn btn-primary btn-sm" onclick="submitPollVote('${threadId}')">
            Votar
          </button>
        ` : ''}

        ${hasVoted ? `
          <div class="poll-voted-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Ya votaste
          </div>
        ` : ''}
      </div>
    </div>
  `;

  return html;
}

// Handle poll vote change
function handlePollVoteChange(threadId, optionId) {
  // This is just to track the selection, actual voting happens on submit
  console.log('Vote changed for thread', threadId, 'option', optionId);
}

// Submit poll vote
async function submitPollVote(threadId) {
  const pollContainer = document.querySelector(`.poll-container[data-thread-id="${threadId}"]`);
  if (!pollContainer) return;

  // Get selected options
  const selectedInputs = pollContainer.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked');
  const selectedOptions = Array.from(selectedInputs).map(input => input.value);

  if (selectedOptions.length === 0) {
    toastWarning('Debes seleccionar al menos una opción');
    return;
  }

  try {
    const response = await fetch(`/forum/threads/${threadId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ optionIds: selectedOptions })
    });

    const data = await response.json();

    if (response.ok) {
      toastSuccess('Voto registrado exitosamente');
      // Reload the thread to show updated results
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } else {
      // Si es un error de autenticación, mostrar advertencia en lugar de error
      if (response.status === 401) {
        toastWarning(data.error || 'Necesitas estar logeado para votar');
      } else {
        toastError('Error: ' + (data.error || 'No se pudo registrar el voto'));
      }
    }
  } catch (error) {
    console.error('Error voting in poll:', error);
    toastError('Error al votar');
  }
}

// Export functions
window.initPollCreation = initPollCreation;
window.renderPollOptions = renderPollOptions;
window.updatePollOption = updatePollOption;
window.addPollOption = addPollOption;
window.removePollOption = removePollOption;
window.getPollData = getPollData;
window.resetPollCreation = resetPollCreation;
window.renderPoll = renderPoll;
window.handlePollVoteChange = handlePollVoteChange;
window.submitPollVote = submitPollVote;
