// Forum Mentions - Handles @ mentions with autocomplete

let mentionSuggestions = [];
let currentMentionQuery = '';
let currentMentionPosition = null;

// Initialize mention functionality for Quill editor
function initMentions(quill) {
  if (!quill) return;

  // Listen for text changes
  quill.on('text-change', (delta, oldDelta, source) => {
    if (source === 'user') {
      handleMentionTrigger(quill);
    }
  });

  // Close suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mention-suggestions')) {
      closeMentionSuggestions();
    }
  });
}

// Handle @ trigger for mentions
function handleMentionTrigger(quill) {
  const selection = quill.getSelection();
  if (!selection) return;

  const cursorPos = selection.index;
  const textBeforeCursor = quill.getText(0, cursorPos);

  // Check if we just typed @ or are in the middle of a mention
  const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

  if (mentionMatch) {
    const query = mentionMatch[1];
    currentMentionQuery = query;
    currentMentionPosition = cursorPos - query.length - 1; // Position of @

    if (query.length >= 0) { // Show suggestions immediately after @
      searchUsers(query, quill);
    }
  } else {
    closeMentionSuggestions();
  }
}

// Search for users
async function searchUsers(query, quill) {
  try {
    const response = await fetch(`/forum/users/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      closeMentionSuggestions();
      return;
    }

    const data = await response.json();
    mentionSuggestions = data.users || [];

    if (mentionSuggestions.length > 0) {
      showMentionSuggestions(quill);
    } else {
      closeMentionSuggestions();
    }
  } catch (error) {
    console.error('Error searching users:', error);
    closeMentionSuggestions();
  }
}

// Show mention suggestions dropdown
function showMentionSuggestions(quill) {
  closeMentionSuggestions(); // Remove existing suggestions

  const editorElement = quill.container;
  const selection = quill.getSelection();
  if (!selection) return;

  // Get cursor position
  const bounds = quill.getBounds(selection.index);

  // Create suggestions dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'mention-suggestions';
  dropdown.style.position = 'absolute';
  dropdown.style.left = `${bounds.left}px`;
  dropdown.style.top = `${bounds.top + bounds.height + 5}px`;
  dropdown.style.zIndex = '1000';

  mentionSuggestions.forEach((user, index) => {
    const item = document.createElement('div');
    item.className = 'mention-suggestion-item';
    item.innerHTML = `
      <img src="${user.picture || '/images/default-avatar.svg'}" alt="${user.name}" class="mention-avatar">
      <div class="mention-info">
        <div class="mention-name">${escapeHtml(user.name)}</div>
        <div class="mention-email">${escapeHtml(user.email)}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      insertMention(quill, user);
    });

    // Keyboard navigation
    item.dataset.index = index;

    dropdown.appendChild(item);
  });

  editorElement.appendChild(dropdown);

  // Add keyboard navigation
  const handleKeyDown = (e) => {
    const activeItem = dropdown.querySelector('.mention-suggestion-item.active');
    const items = dropdown.querySelectorAll('.mention-suggestion-item');

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      let currentIndex = activeItem ? parseInt(activeItem.dataset.index) : -1;

      if (e.key === 'ArrowDown') {
        currentIndex = (currentIndex + 1) % items.length;
      } else {
        currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      }

      items.forEach(item => item.classList.remove('active'));
      items[currentIndex].classList.add('active');
    } else if (e.key === 'Enter' && activeItem) {
      e.preventDefault();
      const index = parseInt(activeItem.dataset.index);
      insertMention(quill, mentionSuggestions[index]);
    } else if (e.key === 'Escape') {
      closeMentionSuggestions();
    }
  };

  // Store handler reference to remove later
  dropdown._keyHandler = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown);

  // Select first item by default
  if (dropdown.querySelector('.mention-suggestion-item')) {
    dropdown.querySelector('.mention-suggestion-item').classList.add('active');
  }
}

// Insert selected mention into editor
function insertMention(quill, user) {
  if (currentMentionPosition === null) return;

  const selection = quill.getSelection();
  if (!selection) return;

  // Calculate deletion length: @ + current query
  const deletionLength = currentMentionQuery.length + 1;

  // Delete the @ and partial query
  quill.deleteText(currentMentionPosition, deletionLength);

  // Insert mention as formatted text
  quill.insertText(currentMentionPosition, `@${user.name}`, {
    color: '#10c6ff',
    bold: true,
    link: `/perfil?uid=${user._id}` // Optional: make it a link
  });

  // Add a space after mention
  quill.insertText(currentMentionPosition + user.name.length + 1, ' ');

  // Move cursor after the mention and space
  quill.setSelection(currentMentionPosition + user.name.length + 2);

  closeMentionSuggestions();
}

// Close mention suggestions dropdown
function closeMentionSuggestions() {
  const dropdown = document.querySelector('.mention-suggestions');
  if (dropdown) {
    // Remove keyboard listener
    if (dropdown._keyHandler) {
      document.removeEventListener('keydown', dropdown._keyHandler);
    }
    dropdown.remove();
  }
  currentMentionQuery = '';
  currentMentionPosition = null;
  mentionSuggestions = [];
}

// Export functions
window.initMentions = initMentions;
window.closeMentionSuggestions = closeMentionSuggestions;
