// State
let state = {
  projects: [],
  prompts: [],
  recent: [],
  favorites: [],
  pro: false,
  darkMode: false,
  currentProject: null,
  editingPrompt: null,
  editingProject: null,
  contextMenuProject: null,
  contextMenuPrompt: null,
  searchFocusedIndex: -1, // For keyboard navigation in search
  showFavoritesOnly: false,
  currentVariablePrompt: null,
  sortBy: 'lastUsed', // 'lastUsed', 'copyCount', 'title', 'created'
  searchFilters: {
    tags: [],
    dateRange: null,
    projects: []
  },
  deletedPrompt: null, // For undo functionality
  firstTimeUser: true,
  archivedPrompts: [], // Array of archived prompt IDs
  promptHistory: {}, // Version history for prompts { promptId: [{timestamp, title, prompt, tags, ...}] }
  selectedPrompts: [], // For batch operations
  templates: [], // Prompt templates
  expandedProjects: {} // Track which projects are expanded { projectId: true/false }
};

// Predefined tags
const PREDEFINED_TAGS = ['SEO', 'X', 'Code', 'Funny', 'Blog', 'Dev'];

// Tag class mapping
function getTagClass(tag) {
  const tagMap = {
    'SEO': 'tag-seo',
    'X': 'tag-x',
    'Code': 'tag-code',
    'Funny': 'tag-funny',
    'Blog': 'tag-blog',
    'Dev': 'tag-dev'
  };
  return tagMap[tag] || 'tag-default';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await initializeSampleData();
  setupEventListeners();
  renderProjects();
  renderPrompts();
  applyDarkMode();
  checkProStatus();
  
  // Show onboarding tour for first-time users
  if (state.firstTimeUser) {
    setTimeout(() => {
      startOnboardingTour();
    }, 500);
  }
  
  // Setup tags autocomplete
  setupTagsAutocomplete();
  
  // Render search filters
  renderSearchFilters();
});

// Load data from storage
async function loadData() {
  const result = await chrome.storage.local.get(['projects', 'prompts', 'recent', 'favorites', 'pro', 'darkMode', 'sortBy', 'firstTimeUser', 'archivedPrompts', 'promptHistory', 'templates', 'expandedProjects']);
  state.projects = result.projects || [];
  state.prompts = result.prompts || [];
  state.recent = result.recent || [];
  state.favorites = result.favorites || [];
  state.sortBy = result.sortBy || 'lastUsed';
  state.firstTimeUser = result.firstTimeUser !== false; // Default to true
  state.archivedPrompts = result.archivedPrompts || [];
  state.promptHistory = result.promptHistory || {};
  state.templates = result.templates || [];
  state.expandedProjects = result.expandedProjects || {};
  // Check both chrome.storage and localStorage for Pro status
  state.pro = result.pro === true;
  try {
    // Check localStorage in popup context
    if (typeof localStorage !== 'undefined' && localStorage.getItem('pro') === 'true') {
      state.pro = true;
      // Sync to chrome.storage
      await chrome.storage.local.set({ pro: true });
    }
  } catch (e) {
    // localStorage might not be available in extension context
  }
  state.darkMode = result.darkMode || false;
  
  // Migrate prompts to include copyCount and createdAt if missing
  let needsSave = false;
  state.prompts.forEach(prompt => {
    if (typeof prompt.copyCount === 'undefined') {
      prompt.copyCount = 0;
      needsSave = true;
    }
    if (typeof prompt.createdAt === 'undefined') {
      prompt.createdAt = prompt.lastUsed || Date.now();
      needsSave = true;
    }
    // Migrate projects to include color, icon, description, parentId
    if (!prompt.version) {
      prompt.version = 1;
    }
  });
  
  // Migrate projects to support enhanced organization
  state.projects.forEach(project => {
    if (typeof project.color === 'undefined') {
      project.color = null;
      needsSave = true;
    }
    if (typeof project.icon === 'undefined') {
      project.icon = null;
      needsSave = true;
    }
    if (typeof project.description === 'undefined') {
      project.description = '';
      needsSave = true;
    }
    if (typeof project.parentId === 'undefined') {
      project.parentId = null;
      needsSave = true;
    }
  });
  
  if (needsSave) {
    await saveData();
  }
  
  // Initialize default templates if empty
  if (state.templates.length === 0) {
    state.templates = getDefaultTemplates();
    await saveData();
  }
}

// Save data to storage
async function saveData() {
  await chrome.storage.local.set({
    projects: state.projects,
    prompts: state.prompts,
    recent: state.recent,
    favorites: state.favorites,
    pro: state.pro,
    darkMode: state.darkMode,
    sortBy: state.sortBy,
    firstTimeUser: state.firstTimeUser,
    archivedPrompts: state.archivedPrompts,
    promptHistory: state.promptHistory,
    templates: state.templates,
    expandedProjects: state.expandedProjects
  });
}

// Initialize sample data if empty
async function initializeSampleData() {
  if (state.projects.length === 0) {
    state.projects = [
      { id: 'general', name: 'General', locked: true },
      { id: 'blogs', name: 'Blogs', locked: true },
      { id: 'x', name: 'X', locked: true }
    ];
  }

  if (state.prompts.length === 0) {
    const samplePrompts = [
    {
      id: generateId(),
      projectId: 'general',
      title: 'Cold Email Opener',
      prompt: 'Write a 3-line cold email opener that grabs attention and introduces [product/service] to [target audience]. Make it personal and value-driven.',
      tags: ['Sales', 'Outreach'],
      lastUsed: Date.now() - 86400000,
      copyCount: 5,
      createdAt: Date.now() - 86400000
    },
      {
        id: generateId(),
        projectId: 'blogs',
        title: 'Blog Intro Hook',
        prompt: 'Start a blog post about [topic] with a compelling hook that makes readers want to continue. Use storytelling or a surprising statistic.',
        tags: ['Blog', 'Hook'],
        lastUsed: Date.now() - 43200000,
        copyCount: 3,
        createdAt: Date.now() - 43200000
      },
      {
        id: generateId(),
        projectId: 'x',
        title: 'X Thread Starter',
        prompt: 'Begin a viral thread on [topic] that will get high engagement. Start with a bold statement or question that makes people curious.',
        tags: ['X', 'Viral'],
        lastUsed: Date.now() - 21600000,
        copyCount: 8,
        createdAt: Date.now() - 21600000
      },
      {
        id: generateId(),
        projectId: 'general',
        title: 'Git Commit',
        prompt: 'Write a conventional commit message for: [describe changes]. Format: type(scope): subject. Types: feat, fix, docs, style, refactor, test, chore.',
        tags: ['Code', 'Git'],
        lastUsed: Date.now() - 7200000,
        copyCount: 12,
        createdAt: Date.now() - 7200000
      },
      {
        id: generateId(),
        projectId: 'blogs',
        title: 'Meta Description',
        prompt: 'Write a 155-character meta description for a blog post titled "[title]". Include the main keyword and a call-to-action.',
        tags: ['SEO', 'Blog'],
        lastUsed: Date.now() - 3600000,
        copyCount: 2,
        createdAt: Date.now() - 3600000
      }
    ];
    state.prompts = samplePrompts;
    state.recent = samplePrompts.slice(0, 3).map(p => p.id);
    await saveData();
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Setup event listeners
function setupEventListeners() {
  // Dark mode toggle
  document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);

  // New prompt button
  document.getElementById('new-prompt-btn').addEventListener('click', () => openPromptModal());

  // New project button
  document.getElementById('new-project-btn').addEventListener('click', () => openProjectModal());

  // Search input with keyboard navigation and debounce
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    state.searchFocusedIndex = -1;
    debouncedRenderPrompts(e.target.value);
  });
  searchInput.addEventListener('keydown', handleSearchKeydown);
  
  // Quick add from clipboard
  document.getElementById('quick-add-clipboard-btn')?.addEventListener('click', quickAddFromClipboard);
  
  // Filter buttons
  document.getElementById('toggle-favorites-btn')?.addEventListener('click', toggleFavoritesFilter);
  document.getElementById('show-archived-btn')?.addEventListener('click', openArchivedModal);
  
  // Onboarding tour
  document.getElementById('tour-next')?.addEventListener('click', nextTourStep);
  document.getElementById('tour-skip')?.addEventListener('click', skipTour);
  
  // Shortcuts modal
  document.getElementById('shortcuts-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal') closeShortcutsModal();
  });
  
  // Archived modal
  document.getElementById('archived-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'archived-modal') closeArchivedModal();
  });

  // Prompt modal
  document.getElementById('prompt-form').addEventListener('submit', handlePromptSave);
  document.getElementById('modal-cancel-btn').addEventListener('click', closePromptModal);

  // Project modal
  document.getElementById('project-form').addEventListener('submit', handleProjectSave);
  document.getElementById('project-modal-cancel-btn').addEventListener('click', closeProjectModal);

  // Click outside modals to close
  document.getElementById('prompt-modal').addEventListener('click', (e) => {
    if (e.target.id === 'prompt-modal') closePromptModal();
  });
  document.getElementById('project-modal').addEventListener('click', (e) => {
    if (e.target.id === 'project-modal') closeProjectModal();
  });
  
  // Template Library Modal
  document.getElementById('template-library-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'template-library-modal') closeTemplateLibrary();
  });
  
  // Import Text Modal
  document.getElementById('import-text-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'import-text-modal') closeImportTextModal();
  });
  
  // Close buttons for new modals
  document.querySelectorAll('#template-library-modal .modal-close, #import-text-modal .modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        if (modal.id === 'template-library-modal') closeTemplateLibrary();
        else if (modal.id === 'import-text-modal') closeImportTextModal();
      }
    });
  });

  // Export/Import (Pro only)
  document.getElementById('export-btn')?.addEventListener('click', exportData);
  document.getElementById('import-btn')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });
  
  // Import CSV
  document.getElementById('import-csv-btn')?.addEventListener('click', () => {
    document.getElementById('import-csv-file-input')?.click();
  });
  
  document.getElementById('import-csv-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importFromCSV(text);
    } catch (error) {
      // Error already shown in importFromCSV
    }
    e.target.value = '';
  });
  
  // Import Text
  document.getElementById('import-text-btn')?.addEventListener('click', () => {
    document.getElementById('import-text-modal').classList.remove('hidden');
  });
  
  document.getElementById('import-text-cancel-btn')?.addEventListener('click', () => {
    closeImportTextModal();
  });
  
  document.getElementById('import-text-submit-btn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('import-text-textarea');
    const text = textarea?.value || '';
    if (!text.trim()) {
      showToast('Please paste some text to import', true, 'error');
      return;
    }
    try {
      await importFromPlainText(text);
      closeImportTextModal();
    } catch (error) {
      // Error already shown
    }
  });
  
  // Template Library
  document.getElementById('template-library-btn')?.addEventListener('click', openTemplateLibrary);

  // Create hidden file input for import
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.id = 'import-file-input';
  importInput.style.display = 'none';
  importInput.addEventListener('change', handleImport);
  document.body.appendChild(importInput);

  // Unlock Pro button
  document.getElementById('unlock-pro-btn')?.addEventListener('click', () => {
    window.open('https://paypal.me/astralshardio/5', '_blank');
  });

  // Context menu
  document.getElementById('context-rename')?.addEventListener('click', () => {
    if (state.contextMenuProject) {
      // Find the actual project object from state to ensure we have the right reference
      const projectToEdit = state.projects.find(p => p.id === state.contextMenuProject.id);
      if (projectToEdit) {
        closeContextMenu();
        openProjectModal(projectToEdit, true);
      }
    }
  });
  document.getElementById('context-delete')?.addEventListener('click', () => {
    if (state.contextMenuProject) {
      deleteProject(state.contextMenuProject.id);
      closeContextMenu();
    }
  });

  // Close context menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#project-context-menu') && !e.target.closest('[data-project-id]')) {
      closeContextMenu();
    }
  });

  // Check for Pro status changes (polling)
  setInterval(checkProStatus, 1000);
  
  // Variable modal
  document.getElementById('variable-cancel-btn')?.addEventListener('click', closeVariableModal);
  document.getElementById('variable-copy-btn')?.addEventListener('click', handleVariableCopy);
  
  // Command palette
  document.getElementById('command-input')?.addEventListener('input', handleCommandInput);
  document.getElementById('command-input')?.addEventListener('keydown', handleCommandKeydown);
  
  // Prompt context menu
  document.getElementById('prompt-context-copy')?.addEventListener('click', () => {
    if (state.contextMenuPrompt) copyPromptWithVariables(state.contextMenuPrompt);
    closePromptContextMenu();
  });
  document.getElementById('prompt-context-edit')?.addEventListener('click', () => {
    if (state.contextMenuPrompt) openPromptModal(state.contextMenuPrompt);
    closePromptContextMenu();
  });
  document.getElementById('prompt-context-duplicate')?.addEventListener('click', () => {
    if (state.contextMenuPrompt) duplicatePrompt(state.contextMenuPrompt);
    closePromptContextMenu();
  });
  document.getElementById('prompt-context-favorite')?.addEventListener('click', () => {
    if (state.contextMenuPrompt) toggleFavorite(state.contextMenuPrompt.id);
    closePromptContextMenu();
  });
  document.getElementById('prompt-context-delete')?.addEventListener('click', () => {
    if (state.contextMenuPrompt) archivePrompt(state.contextMenuPrompt.id);
    closePromptContextMenu();
  });
  document.getElementById('prompt-context-find-duplicates')?.addEventListener('click', () => {
    if (state.contextMenuPrompt) {
      const duplicates = detectDuplicates(state.contextMenuPrompt);
      if (duplicates.length > 0) {
        showDuplicateResults(state.contextMenuPrompt, duplicates);
      } else {
        showToast('No duplicates found', false, 'success');
      }
    }
    closePromptContextMenu();
  });
  
  // Global keyboard handler
  document.addEventListener('keydown', handleGlobalKeydown);
}

// Dark mode
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  applyDarkMode();
  saveData();
}

function applyDarkMode() {
  const moonIcon = document.getElementById('moon-icon');
  const sunIcon = document.getElementById('sun-icon');
  
  if (state.darkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    if (moonIcon) moonIcon.classList.remove('hidden');
    if (sunIcon) sunIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    if (moonIcon) moonIcon.classList.add('hidden');
    if (sunIcon) sunIcon.classList.remove('hidden');
  }
}

function checkProStatus() {
  try {
    // Check localStorage for Pro status (user sets it manually in DevTools)
    if (typeof localStorage !== 'undefined' && localStorage.getItem('pro') === 'true') {
      if (!state.pro) {
        state.pro = true;
        saveData();
      }
    }
  } catch (e) {
    // localStorage might not be available
  }
  updateProUI();
}

function updateProUI() {
  const proBadge = document.getElementById('pro-badge');
  const proActions = document.getElementById('pro-actions');
  if (state.pro) {
    proBadge?.classList.remove('hidden');
    proActions?.classList.remove('hidden');
  } else {
    proBadge?.classList.add('hidden');
    proActions?.classList.add('hidden');
  }
}

// Render projects
function renderProjects() {
  const container = document.getElementById('projects-list');
  container.innerHTML = '';
  
  // Add drop zone at the top for unnesting to top level
  const topDropZone = document.createElement('div');
  topDropZone.className = 'project-drop-zone';
  topDropZone.dataset.dropZoneLevel = '0';
  topDropZone.style.display = 'none'; // Hidden by default, shown on drag
  
  // Handle drag events for drop zones
  topDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggingId = e.dataTransfer.getData('text/plain');
    if (!draggingId) return;
    
    const draggingProject = state.projects.find(p => p.id === draggingId);
    if (draggingProject && draggingProject.parentId) {
      topDropZone.style.display = 'block';
      topDropZone.classList.add('drop-zone-active');
    }
  });
  
  topDropZone.addEventListener('dragleave', (e) => {
    if (!topDropZone.contains(e.relatedTarget)) {
      topDropZone.style.display = 'none';
      topDropZone.classList.remove('drop-zone-active');
    }
  });
  
  topDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    topDropZone.style.display = 'none';
    topDropZone.classList.remove('drop-zone-active');
    
    const draggingId = e.dataTransfer.getData('text/plain');
    if (!draggingId) return;
    
    const draggingProject = state.projects.find(p => p.id === draggingId);
    if (draggingProject && draggingProject.parentId) {
      // Move to top level
      draggingProject.parentId = null;
      
      // Move to top of array
      const draggingIndex = state.projects.findIndex(p => p.id === draggingId);
      if (draggingIndex !== -1) {
        state.projects.splice(draggingIndex, 1);
        state.projects.unshift(draggingProject);
      }
      
      saveData();
      renderProjects();
      showToast(`"${draggingProject.name}" moved to top level`, false, 'success');
    }
  });
  
  container.appendChild(topDropZone);

  // Build project tree (handle nested projects)
  const projectTree = buildProjectTree();
  
  function renderProjectNode(project, level = 0, isLast = false, parentExpanded = true) {
    // Skip rendering if parent is collapsed
    if (level > 0 && !parentExpanded) {
      return;
    }
    
    const item = document.createElement('div');
    const isActive = state.currentProject === project.id;
    const hasChildren = project.children && project.children.length > 0;
    const isExpanded = state.expandedProjects[project.id] !== false; // Default to expanded
    item.className = `project-item ${isActive ? 'active' : ''} ${level > 0 ? 'project-item-nested' : ''} ${hasChildren ? 'project-item-parent' : ''} ${project.locked ? 'project-item-locked' : 'project-item-draggable'}`;
    item.dataset.projectId = project.id;
    item.dataset.level = level;
    item.draggable = !project.locked; // Make draggable if not locked
    
    // Add indentation for nested items - more visible spacing
    const indentPx = level * 24;
    item.style.paddingLeft = `${indentPx + 12}px`;
    item.style.position = 'relative';
    
    const icon = getProjectIcon(project);
    const color = getProjectColor(project);
    const stats = getProjectStats(project.id);
    const menuSpan = project.locked ? '' : '<span class="project-item-menu">⋯</span>';
    
    // Add visual indicator for nested items (no arrow)
    let nestedIndicator = '';
    if (level > 0) {
      nestedIndicator = `<span class="project-nest-indicator">${isLast ? '└' : '├'}</span>`;
    }
    
    if (color) {
      item.style.backgroundColor = color + '15';
    }
    
    item.innerHTML = `
      ${nestedIndicator}
      <span class="project-item-icon">${icon}</span>
      <span class="project-item-name">${escapeHtml(project.name)}</span>
      ${menuSpan}
    `;

    // Drag and drop handlers
    if (!project.locked) {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', project.id);
        item.classList.add('dragging');
        
        // Show top-level drop zone if dragging a nested project
        if (project.parentId) {
          setTimeout(() => {
            const topDropZone = document.querySelector('.project-drop-zone[data-drop-zone-level="0"]');
            if (topDropZone) {
              topDropZone.style.display = 'block';
            }
          }, 10);
        }
      });
      
      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
        // Remove all drop indicators
        document.querySelectorAll('.project-item-drag-over').forEach(el => {
          el.classList.remove('project-item-drag-over', 'drag-over-top', 'drag-over-bottom', 'drag-over-nest', 'drag-over-unnest');
        });
        // Hide drop zones
        document.querySelectorAll('.project-drop-zone').forEach(zone => {
          zone.style.display = 'none';
          zone.classList.remove('drop-zone-active');
        });
      });
      
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const draggingId = e.dataTransfer.getData('text/plain');
        if (!draggingId || draggingId === project.id) return;
        
        const draggingProject = state.projects.find(p => p.id === draggingId);
        if (!draggingProject) return;
        
        // Don't allow dropping on itself or its children
        if (isDescendant(project.id, draggingId)) {
          return;
        }
        
        const rect = item.getBoundingClientRect();
        const mouseY = e.clientY;
        const edgeThreshold = rect.height * 0.25; // Top/bottom 25% is for reordering/unnesting
        const isNearTop = mouseY < rect.top + edgeThreshold;
        const isNearBottom = mouseY > rect.bottom - edgeThreshold;
        const isSameLevel = draggingProject.parentId === project.parentId;
        const isNested = draggingProject.parentId !== null;
        const targetParent = project.parentId;
        const canUnnest = isNested && isNearTop && targetParent === draggingProject.parentId;
        
        // Determine drop mode: reordering, unnesting, or nesting
        if ((isNearTop || isNearBottom) && isSameLevel) {
          // Reorder mode (same level, at edges)
          item.classList.add('project-item-drag-over');
          if (isNearTop) {
            item.classList.add('drag-over-top');
            item.classList.remove('drag-over-bottom', 'drag-over-nest', 'drag-over-unnest');
          } else {
            item.classList.add('drag-over-bottom');
            item.classList.remove('drag-over-top', 'drag-over-nest', 'drag-over-unnest');
          }
        } else if (canUnnest) {
          // Unnest mode (drop at top edge to move to parent's level)
          item.classList.add('project-item-drag-over', 'drag-over-unnest');
          item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-nest');
        } else if (!project.locked) {
          // Nest mode (drop in middle area to make it a child or change parent)
          item.classList.add('project-item-drag-over', 'drag-over-nest');
          item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-unnest');
        }
      });
      
      item.addEventListener('dragleave', (e) => {
        item.classList.remove('project-item-drag-over', 'drag-over-top', 'drag-over-bottom', 'drag-over-nest', 'drag-over-unnest');
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('project-item-drag-over', 'drag-over-top', 'drag-over-bottom', 'drag-over-nest', 'drag-over-unnest');
        
        // Hide drop zones
        document.querySelectorAll('.project-drop-zone').forEach(zone => {
          zone.style.display = 'none';
          zone.classList.remove('drop-zone-active');
        });
        
        const draggingId = e.dataTransfer.getData('text/plain');
        if (!draggingId || draggingId === project.id) return;
        
        const draggingProject = state.projects.find(p => p.id === draggingId);
        if (!draggingProject) return;
        
        // Don't allow dropping on itself or its children
        if (isDescendant(project.id, draggingId)) {
          showToast('Cannot drop project into its own child', true, 'error');
          return;
        }
        
        // Don't allow nesting into locked projects
        if (project.locked) {
          showToast('Cannot nest into locked projects', true, 'error');
          return;
        }
        
        const rect = item.getBoundingClientRect();
        const mouseY = e.clientY;
        const edgeThreshold = rect.height * 0.25;
        const isNearTop = mouseY < rect.top + edgeThreshold;
        const isNearBottom = mouseY > rect.bottom - edgeThreshold;
        const isSameLevel = draggingProject.parentId === project.parentId;
        const isNested = draggingProject.parentId !== null;
        const targetParent = project.parentId;
        
        // Determine if this is nesting, reordering, or unnesting
        if ((isNearTop || isNearBottom) && isSameLevel) {
          // Reorder mode: move within same level
          const draggingIndex = state.projects.findIndex(p => p.id === draggingId);
          const targetIndex = state.projects.findIndex(p => p.id === project.id);
          
          if (draggingIndex === -1 || targetIndex === -1) return;
          
          // Remove dragging project
          state.projects.splice(draggingIndex, 1);
          
          // Calculate new index (accounting for removal)
          let newIndex = targetIndex;
          if (draggingIndex < targetIndex) {
            newIndex = targetIndex - 1;
          }
          
          // Insert at new position
          if (isNearTop) {
            state.projects.splice(newIndex, 0, draggingProject);
          } else {
            state.projects.splice(newIndex + 1, 0, draggingProject);
          }
          
          saveData();
          renderProjects();
          showToast('Project reordered!', false, 'success');
        } else if (isNearTop && isNested && targetParent === draggingProject.parentId) {
          // Unnest mode: move to parent's level (drop at top edge of sibling)
          // This moves the project to the same level as the target (parent's level)
          const oldParentId = draggingProject.parentId;
          draggingProject.parentId = targetParent; // Same level as target
          
          // Move the project to before the target in the array
          const draggingIndex = state.projects.findIndex(p => p.id === draggingId);
          const targetIndex = state.projects.findIndex(p => p.id === project.id);
          
          if (draggingIndex !== -1 && targetIndex !== -1) {
            state.projects.splice(draggingIndex, 1);
            let newIndex = targetIndex;
            if (draggingIndex < targetIndex) {
              newIndex = targetIndex - 1;
            }
            state.projects.splice(newIndex, 0, draggingProject);
          }
          
          saveData();
          renderProjects();
          showToast(`"${draggingProject.name}" moved to same level as "${project.name}"`, false, 'success');
        } else if (!project.locked) {
          // Nest mode: make dragging project a child of target project
          // OR change parent if already nested
          const wasNested = draggingProject.parentId !== null;
          draggingProject.parentId = project.id;
          
          // Move the project to after its new parent in the array for better visual ordering
          const parentIndex = state.projects.findIndex(p => p.id === project.id);
          const draggingIndex = state.projects.findIndex(p => p.id === draggingId);
          
          if (draggingIndex !== -1 && parentIndex !== -1) {
            // Remove from current position
            state.projects.splice(draggingIndex, 1);
            
            // Find the correct insert position after parent
            // Need to recalculate parentIndex after removal
            const newParentIndex = draggingIndex < parentIndex 
              ? parentIndex - 1 
              : parentIndex;
            
            // Insert after parent (or after all of parent's children)
            let insertIndex = newParentIndex + 1;
            // Find where parent's children end
            while (insertIndex < state.projects.length) {
              const nextProject = state.projects[insertIndex];
              if (!nextProject.parentId || nextProject.parentId !== project.id) {
                break;
              }
              insertIndex++;
            }
            state.projects.splice(insertIndex, 0, draggingProject);
          }
          
          // Expand the parent to show the new child
          state.expandedProjects[project.id] = true;
          
          saveData();
          renderProjects();
          if (wasNested) {
            showToast(`"${draggingProject.name}" moved under "${project.name}"`, false, 'success');
          } else {
            showToast(`"${draggingProject.name}" nested under "${project.name}"`, false, 'success');
          }
        }
      });
    }
    
    // Click handler - toggle expand/collapse for parents, filter for others
    item.addEventListener('click', (e) => {
      // Handle menu click separately - don't do anything else
      if (e.target.classList && (e.target.classList.contains('project-item-menu') || e.target.closest('.project-item-menu'))) {
        e.preventDefault();
        e.stopPropagation();
        // Trigger context menu
        const rect = e.target.getBoundingClientRect();
        const fakeEvent = {
          pageX: rect.right,
          pageY: rect.bottom,
          preventDefault: () => {},
          stopPropagation: () => {}
        };
        showContextMenu(fakeEvent, project);
        return;
      }
      
      // If it's a parent item, clicking anywhere should toggle expand/collapse
      if (hasChildren) {
        e.preventDefault();
        e.stopPropagation();
        state.expandedProjects[project.id] = !isExpanded;
        saveData();
        renderProjects();
        return;
      }
      
      // For items without children, filter prompts (original behavior)
      e.stopPropagation();
      
      // Update state immediately
      const wasActive = state.currentProject === project.id;
      state.currentProject = wasActive ? null : project.id;
      
      // Update active classes immediately - don't re-render entire list
      const allItems = document.querySelectorAll('.project-item');
      allItems.forEach(i => {
        const itemProjectId = i.dataset.projectId;
        if (itemProjectId === project.id) {
          if (wasActive) {
            i.classList.remove('active');
          } else {
            i.classList.add('active');
          }
        } else {
          i.classList.remove('active');
        }
      });
      
      // Render prompts immediately without any delay
      renderPrompts(document.getElementById('search-input')?.value || '');
    }, { passive: true });

    // Right-click for context menu (non-locked only)
    if (!project.locked) {
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, project);
      });
    }

    container.appendChild(item);
    
    // Render children recursively only if parent is expanded
    if (project.children && project.children.length > 0 && isExpanded) {
      project.children.forEach((child, index) => {
        // Add visual connection for nested items
        const isLast = index === project.children.length - 1;
        renderProjectNode(child, level + 1, isLast, isExpanded);
      });
    }
  }
  
  // Render all root projects and their children
  projectTree.forEach(project => {
    const isExpanded = state.expandedProjects[project.id] !== false;
    renderProjectNode(project, 0, false, isExpanded);
  });
}

// Context menu
function showContextMenu(e, project) {
  const menu = document.getElementById('project-context-menu');
  state.contextMenuProject = project;
  
  // Use pageX/pageY if available, otherwise calculate from element
  if (e.pageX && e.pageY) {
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
  } else {
    // Fallback positioning
    const rect = document.querySelector(`[data-project-id="${project.id}"]`)?.getBoundingClientRect();
    if (rect) {
      menu.style.left = (rect.right - 120) + 'px';
      menu.style.top = (rect.bottom + 5) + 'px';
    }
  }
  
  menu.classList.remove('hidden');
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      closeContextMenu();
      document.removeEventListener('click', closeMenu);
    }, { once: true });
  }, 0);
}

function closeContextMenu() {
  document.getElementById('project-context-menu').classList.add('hidden');
  state.contextMenuProject = null;
}

// Render prompts
function renderPrompts(searchQuery = '') {
  const container = document.getElementById('prompts-grid');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-input');
  if (!searchQuery && searchInput) {
    searchQuery = searchInput.value || '';
  }
  
  container.innerHTML = '';

  // Exclude archived prompts
  let filteredPrompts = state.prompts.filter(p => !state.archivedPrompts.includes(p.id));

  // Filter by favorites
  if (state.showFavoritesOnly) {
    filteredPrompts = filteredPrompts.filter(p => state.favorites.includes(p.id));
  }

  // Filter by project
  if (state.currentProject) {
    filteredPrompts = filteredPrompts.filter(p => p.projectId === state.currentProject);
  }

  // Filter by search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredPrompts = filteredPrompts.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.prompt.toLowerCase().includes(query) ||
      p.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Apply additional filters
  if (state.searchFilters.tags.length > 0) {
    filteredPrompts = filteredPrompts.filter(p => 
      state.searchFilters.tags.some(filterTag => p.tags.includes(filterTag))
    );
  }
  
  if (state.searchFilters.projects.length > 0 && !state.currentProject) {
    filteredPrompts = filteredPrompts.filter(p => 
      state.searchFilters.projects.includes(p.projectId)
    );
  }
  
  if (state.searchFilters.dateRange) {
    const now = Date.now();
    const range = state.searchFilters.dateRange;
    filteredPrompts = filteredPrompts.filter(p => {
      const date = p.lastUsed || p.createdAt || 0;
      if (range === 'today') return date > now - 86400000;
      if (range === 'week') return date > now - 604800000;
      if (range === 'month') return date > now - 2592000000;
      return true;
    });
  }
  
  // Sort: favorites first, then by selected sort option
  filteredPrompts.sort((a, b) => {
    const aFav = state.favorites.includes(a.id);
    const bFav = state.favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    
    // Apply sorting
    if (state.sortBy === 'copyCount') {
      return (b.copyCount || 0) - (a.copyCount || 0);
    } else if (state.sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (state.sortBy === 'created') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else {
      return (b.lastUsed || 0) - (a.lastUsed || 0);
    }
  });

  if (filteredPrompts.length === 0) {
    emptyState.classList.remove('hidden');
    updateEmptyState(searchQuery, state.showFavoritesOnly || state.searchFilters.tags.length > 0 || state.searchFilters.dateRange);
    return;
  }

  emptyState.classList.add('hidden');

  filteredPrompts.forEach((prompt, index) => {
    const card = createPromptCard(prompt, index);
    container.appendChild(card);
  });
  
  // Highlight search terms
  if (searchQuery) {
    highlightSearchTerms(filteredPrompts, searchQuery);
  }
  
  // Update search result highlighting
  if (searchQuery && state.searchFocusedIndex >= 0) {
    highlightSearchResult(state.searchFocusedIndex);
  }
  
  // Setup inline edit and contextual help
  filteredPrompts.forEach((prompt, index) => {
    const card = container.children[index];
    if (card) {
      setupInlineEdit(card, prompt);
    }
  });
}

// Create prompt card
function createPromptCard(prompt, index) {
  const card = document.createElement('div');
  const isFavorite = state.favorites.includes(prompt.id);
  card.className = 'prompt-card';
  card.dataset.promptId = prompt.id;
  
  const project = state.projects.find(p => p.id === prompt.projectId);
  const preview = prompt.prompt.length > 100 ? prompt.prompt.substring(0, 100) + '...' : prompt.prompt;
  const previewLines = preview.split('\n').slice(0, 2).join('\n');
  const hasVariables = prompt.prompt.includes('{{');
  
  card.innerHTML = `
    <div class="prompt-card-header">
      <h4 class="prompt-card-title" contenteditable="false" data-original-title="${escapeHtml(prompt.title)}">${escapeHtml(prompt.title)}${hasVariables ? ' <span style="font-size: 10px; color: var(--text-muted);">[Template]</span>' : ''}</h4>
      <div class="prompt-card-actions">
        <button class="action-btn favorite-btn ${isFavorite ? 'favorited' : ''}" data-prompt-id="${prompt.id}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
          <svg width="16" height="16" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
          </svg>
        </button>
        <button class="action-btn edit-prompt" data-prompt-id="${prompt.id}" title="Edit">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button class="action-btn delete archive-prompt" data-prompt-id="${prompt.id}" title="Archive">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
        </button>
      </div>
    </div>
    <p class="prompt-card-preview">${escapeHtml(previewLines)}</p>
    <div class="prompt-card-tags">
      ${prompt.tags.map(tag => {
        const tagClass = getTagClass(tag);
        return `<span class="tag ${tagClass}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`;
      }).join('')}
    </div>
    <button class="btn btn-primary copy-prompt" data-prompt-id="${prompt.id}">Copy</button>
  `;

  // Event listeners
  card.querySelector('.copy-prompt')?.addEventListener('click', () => copyPromptWithVariables(prompt));
  card.querySelector('.edit-prompt')?.addEventListener('click', () => openPromptModal(prompt));
  card.querySelector('.archive-prompt')?.addEventListener('click', () => archivePrompt(prompt.id));
  
  // Favorites
  const favoriteBtn = card.querySelector('.favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(prompt.id);
    });
  }
  
  // Right-click context menu
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showPromptContextMenu(e, prompt);
  });
  
  // Click on tags to filter (opens dropdown and selects tag)
  card.querySelectorAll('.tag').forEach(tagEl => {
    tagEl.style.cursor = 'pointer';
    tagEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag = tagEl.dataset.tag;
      if (tag) {
        // Open dropdown if not already open
        const dropdown = document.querySelector('.tag-filter-dropdown');
        if (dropdown) {
          const button = dropdown.querySelector('.tag-filter-button');
          if (!dropdown.classList.contains('open')) {
            dropdown.classList.add('open');
            if (dropdown._menu) {
              dropdown._menu.classList.remove('hidden');
              updateDropdownPosition(dropdown, button);
            }
          }
        }
        // Toggle the tag filter
        toggleTagFilter(tag);
      }
    });
  });

  return card;
}

// Copy prompt
async function copyPrompt(prompt) {
  try {
    await navigator.clipboard.writeText(prompt.prompt);
    
    // Update lastUsed and copyCount
    prompt.lastUsed = Date.now();
    prompt.copyCount = (prompt.copyCount || 0) + 1;
    
    // Update recent list
    state.recent = state.recent.filter(id => id !== prompt.id);
    state.recent.unshift(prompt.id);
    state.recent = state.recent.slice(0, 3);
    
    await saveData();
    renderPrompts(); // Re-render to update copy count display
    
    // Visual feedback on copy button
    const copyBtn = document.querySelector(`[data-prompt-id="${prompt.id}"] .copy-prompt`);
    if (copyBtn) {
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 600);
    }
    
    showToast('Prompt copied to clipboard!', false, 'success');
  } catch (err) {
    showToast('Failed to copy prompt', true, 'error');
  }
}

// Copy prompt with variable replacement
async function copyPromptWithVariables(prompt) {
  const variables = extractVariables(prompt.prompt);
  if (variables.length === 0) {
    return copyPrompt(prompt);
  }
  
  // Show variable modal
  openVariableModal(prompt, variables);
}

// Extract variables from prompt text
function extractVariables(promptText) {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  let match;
  while ((match = regex.exec(promptText)) !== null) {
    const varName = match[1].trim();
    if (!variables.find(v => v.name === varName)) {
      variables.push({ name: varName, value: '' });
    }
  }
  return variables;
}

// Prompt modal
function openPromptModal(prompt = null) {
  state.editingPrompt = prompt;
  
  // Reset highlighted state
  document.querySelectorAll('[data-highlighted]').forEach(el => {
    el.removeAttribute('data-highlighted');
  });
  const modal = document.getElementById('prompt-modal');
  const title = document.getElementById('modal-title');
  const titleInput = document.getElementById('modal-title-input');
  const projectSelect = document.getElementById('modal-project-select');
  const tagsInput = document.getElementById('modal-tags-input');
  const promptTextarea = document.getElementById('modal-prompt-textarea');

  title.textContent = prompt ? 'Edit Prompt' : 'New Prompt';
  
  // Populate projects
  projectSelect.innerHTML = state.projects.map(p => 
    `<option value="${p.id}" ${prompt && prompt.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  if (prompt) {
    titleInput.value = prompt.title;
    tagsInput.value = prompt.tags.join(', ');
    promptTextarea.value = prompt.prompt;
  } else {
    titleInput.value = '';
    tagsInput.value = '';
    promptTextarea.value = '';
    if (state.currentProject) {
      projectSelect.value = state.currentProject;
    }
  }

  // Ensure tags autocomplete is available
  setupTagsAutocomplete();
  
  modal.classList.remove('hidden');
  titleInput.focus();
}

function closePromptModal() {
  document.getElementById('prompt-modal').classList.add('hidden');
  state.editingPrompt = null;
}

async function handlePromptSave(e) {
  e.preventDefault();
  const titleInput = document.getElementById('modal-title-input');
  const projectSelect = document.getElementById('modal-project-select');
  const tagsInput = document.getElementById('modal-tags-input');
  const promptTextarea = document.getElementById('modal-prompt-textarea');

  const title = titleInput.value.trim();
  const projectId = projectSelect.value;
  const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  const prompt = promptTextarea.value.trim();

  if (!title || !prompt) {
    showToast('Title and prompt are required', true);
    return;
  }

  if (state.editingPrompt) {
    // Save version history before updating
    if (!state.promptHistory[state.editingPrompt.id]) {
      state.promptHistory[state.editingPrompt.id] = [];
    }
    state.promptHistory[state.editingPrompt.id].push({
      timestamp: Date.now(),
      title: state.editingPrompt.title,
      prompt: state.editingPrompt.prompt,
      tags: [...state.editingPrompt.tags],
      projectId: state.editingPrompt.projectId
    });
    // Keep only last 10 versions
    if (state.promptHistory[state.editingPrompt.id].length > 10) {
      state.promptHistory[state.editingPrompt.id] = state.promptHistory[state.editingPrompt.id].slice(-10);
    }
    
    // Update existing
    state.editingPrompt.title = title;
    state.editingPrompt.projectId = projectId;
    state.editingPrompt.tags = tags;
    state.editingPrompt.prompt = prompt;
    state.editingPrompt.version = (state.editingPrompt.version || 1) + 1;
  } else {
    // Check for duplicates before creating new
    const newPrompt = {
      id: generateId(),
      projectId,
      title,
      prompt,
      tags,
      lastUsed: 0,
      copyCount: 0,
      createdAt: Date.now(),
      version: 1
    };
    
    if (!checkForDuplicatesBeforeSave(newPrompt)) {
      return; // User cancelled
    }
    
    state.prompts.push(newPrompt);
  }

  await saveData();
  renderPrompts();
  renderRecentPrompts();
  renderTagFilters(); // Update tag filters when prompts change
  closePromptModal();
  showToast(state.editingPrompt ? 'Prompt updated!' : 'Prompt created!');
}

// Build project tree for nested display
function buildProjectTree() {
  const rootProjects = state.projects.filter(p => !p.parentId);
  const childrenMap = {};
  
  state.projects.forEach(p => {
    if (p.parentId) {
      if (!childrenMap[p.parentId]) childrenMap[p.parentId] = [];
      childrenMap[p.parentId].push(p);
    }
  });
  
  // Use array order instead of alphabetical sorting to preserve drag-and-drop order
  // Projects maintain their order in the array
  function buildTree(parentId = null) {
    const projects = parentId ? (childrenMap[parentId] || []) : rootProjects;
    // Sort by current array order (maintain insertion order)
    const orderedProjects = projects.sort((a, b) => {
      const indexA = state.projects.findIndex(p => p.id === a.id);
      const indexB = state.projects.findIndex(p => p.id === b.id);
      return indexA - indexB;
    });
    return orderedProjects.map(p => ({
      ...p,
      children: buildTree(p.id)
    }));
  }
  
  return buildTree();
}

// Project modal
function openProjectModal(project = null, isRename = false) {
  state.editingProject = project;
  const modal = document.getElementById('project-modal');
  const title = document.getElementById('project-modal-title');
  const nameInput = document.getElementById('project-name-input');
  const descriptionInput = document.getElementById('project-description-input');
  const colorInput = document.getElementById('project-color-input');
  const iconInput = document.getElementById('project-icon-input');
  const parentSelect = document.getElementById('project-parent-select');

  title.textContent = isRename ? 'Edit Project' : 'New Project';
  
  // Populate parent select (exclude self and children)
  if (parentSelect) {
    const availableParents = state.projects.filter(p => 
      !p.locked && 
      p.id !== project?.id && 
      !isDescendant(p.id, project?.id)
    );
    parentSelect.innerHTML = '<option value="">None (Top Level)</option>' +
      availableParents.map(p => 
        `<option value="${p.id}" ${project?.parentId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
      ).join('');
  }
  
  if (nameInput) nameInput.value = project ? project.name : '';
  if (descriptionInput) descriptionInput.value = project?.description || '';
  if (colorInput) colorInput.value = project?.color || '';
  if (iconInput) iconInput.value = project?.icon || '';

  modal.classList.remove('hidden');
  if (nameInput) nameInput.focus();
}

function isDescendant(projectId, ancestorId) {
  if (!ancestorId) return false;
  const project = state.projects.find(p => p.id === projectId);
  if (!project || !project.parentId) return false;
  if (project.parentId === ancestorId) return true;
  return isDescendant(project.parentId, ancestorId);
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.add('hidden');
  state.editingProject = null;
}

function handleProjectSave(e) {
  e.preventDefault();
  const nameInput = document.getElementById('project-name-input');
  const descriptionInput = document.getElementById('project-description-input');
  const colorInput = document.getElementById('project-color-input');
  const iconInput = document.getElementById('project-icon-input');
  const parentSelect = document.getElementById('project-parent-select');
  
  const name = nameInput?.value.trim() || '';
  const description = descriptionInput?.value.trim() || '';
  const color = colorInput?.value.trim() || null;
  const icon = iconInput?.value.trim() || null;
  const parentId = parentSelect?.value || null;

  if (!name) {
    showToast('Project name is required', true);
    return;
  }

  // Check if project name already exists
  if (state.projects.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== state.editingProject?.id)) {
    showToast('Project name already exists', true);
    return;
  }

  // Check Pro status for unlimited projects (default 3 projects are locked, so count only custom ones)
  const customProjectsCount = state.projects.filter(p => !p.locked).length;
  if (!state.pro && !state.editingProject && customProjectsCount >= 3) {
    showToast('Pro required for more than 3 custom projects. Upgrade to create unlimited projects!', true);
    return;
  }

  // Find the project in state.projects to ensure we're editing the right one
  const existingProject = state.editingProject ? state.projects.find(p => p.id === state.editingProject.id) : null;
  
  if (existingProject) {
    // Update existing project
    existingProject.name = name;
    existingProject.description = description;
    existingProject.color = color;
    existingProject.icon = icon;
    existingProject.parentId = parentId;
    state.editingProject = null; // Clear editing state
  } else {
    // Create new project
    const newProject = {
      id: generateId(),
      name,
      locked: false,
      description,
      color,
      icon,
      parentId
    };
    state.projects.push(newProject);
  }

  saveData();
  renderProjects();
  closeProjectModal();
  showToast(existingProject ? 'Project updated!' : 'Project created!');
}

// Archive prompt (soft delete)
async function archivePrompt(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (!prompt) return;
  
  if (!state.archivedPrompts.includes(id)) {
    state.archivedPrompts.push(id);
    state.recent = state.recent.filter(rid => rid !== id);
    
    await saveData();
    renderPrompts();
    renderTagFilters(); // Update tag filters
    
    showToast('Prompt archived!', false, 'success', async function undoArchive() {
      state.archivedPrompts = state.archivedPrompts.filter(aid => aid !== id);
      await saveData();
      renderPrompts();
      renderTagFilters();
    });
  }
}

// Restore archived prompt
async function restorePrompt(id) {
  state.archivedPrompts = state.archivedPrompts.filter(aid => aid !== id);
  await saveData();
  
  // Update the archived modal list immediately
  openArchivedModal();
  
  renderPrompts();
  renderTagFilters();
  showToast('Prompt restored!', false, 'success');
}

// Delete prompt permanently (from archive)
async function deletePrompt(id) {
  if (confirm('Are you sure you want to permanently delete this prompt? This cannot be undone.')) {
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) return;
    
    state.prompts = state.prompts.filter(p => p.id !== id);
    state.recent = state.recent.filter(rid => rid !== id);
    state.favorites = state.favorites.filter(fid => fid !== id);
    state.archivedPrompts = state.archivedPrompts.filter(aid => aid !== id);
    
    await saveData();
    
    // Update the archived modal list immediately
    openArchivedModal();
    
    renderPrompts();
    renderTagFilters();
    
    showToast('Prompt permanently deleted!', false, 'success');
  }
}

// Delete project
async function deleteProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project || project.locked) return;

  if (confirm(`Are you sure you want to delete "${project.name}"? All prompts in this project will be moved to General.`)) {
    // Move prompts to General
    state.prompts.forEach(p => {
      if (p.projectId === id) {
        p.projectId = 'general';
      }
    });

    // Remove project
    state.projects = state.projects.filter(p => p.id !== id);
    
    await saveData();
    renderProjects();
    renderPrompts();
    showToast('Project deleted!');
  }
}

// Export/Import
function exportData() {
  const data = {
    projects: state.projects,
    prompts: state.prompts,
    recent: state.recent,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prompthub-backup.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!');
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      
      if (confirm('Import will merge with existing data. Continue?')) {
        // Merge projects
        imported.projects?.forEach(imp => {
          if (!state.projects.find(p => p.id === imp.id)) {
            state.projects.push(imp);
          }
        });

        // Merge prompts
        imported.prompts?.forEach(imp => {
          const existing = state.prompts.find(p => p.id === imp.id);
          if (existing) {
            Object.assign(existing, imp);
          } else {
            state.prompts.push(imp);
          }
        });

        // Update recent
        if (imported.recent) {
          state.recent = [...new Set([...state.recent, ...imported.recent])].slice(0, 3);
        }

        await saveData();
        renderProjects();
        renderPrompts();
        showToast('Data imported!');
      }
    } catch (err) {
      showToast('Failed to import data', true);
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset input
}

// Toast notification with icons and undo
function showToast(message, isError = false, type = 'info', undoAction = null) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  let icon = '';
  if (type === 'success') {
    icon = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
  } else if (type === 'error' || isError) {
    icon = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  } else {
    icon = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }
  
  let undoBtn = '';
  if (undoAction) {
    const undoId = 'undo-' + Date.now();
    undoBtn = `<button class="toast-undo" id="${undoId}">Undo</button>`;
    setTimeout(() => {
      const undoButton = document.getElementById(undoId);
      if (undoButton) {
        undoButton.addEventListener('click', () => {
          undoAction();
          toast.classList.add('hidden');
        });
      }
    }, 10);
  }
  
  toastMessage.innerHTML = `${icon}<span>${escapeHtml(message)}</span>${undoBtn}`;
  toast.className = `toast ${isError || type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
  toast.classList.remove('hidden');
  
  // Animate toast
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.classList.add('hidden');
  }, undoAction ? 5000 : 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== NEW FEATURES ==========

// Toggle favorites filter
function toggleFavoritesFilter() {
  state.showFavoritesOnly = !state.showFavoritesOnly;
  const btn = document.getElementById('toggle-favorites-btn');
  if (state.showFavoritesOnly) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
  renderPrompts();
}


// Toggle favorite
function toggleFavorite(promptId) {
  const index = state.favorites.indexOf(promptId);
  if (index > -1) {
    state.favorites.splice(index, 1);
  } else {
    state.favorites.push(promptId);
  }
  saveData();
  renderPrompts();
  renderRecentPrompts();
}

// Duplicate prompt
function duplicatePrompt(prompt) {
  const newPrompt = {
    ...prompt,
    id: generateId(),
    title: prompt.title + ' (Copy)',
    lastUsed: 0
  };
  state.prompts.push(newPrompt);
  saveData();
  renderPrompts();
  showToast('Prompt duplicated!');
}

// Open variable modal
function openVariableModal(prompt, variables) {
  const modal = document.getElementById('variable-modal');
  const inputsContainer = document.getElementById('variable-inputs');
  inputsContainer.innerHTML = '';
  
  variables.forEach(variable => {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
      <label>${escapeHtml(variable.name)}</label>
      <input type="text" class="form-input variable-input" data-variable="${escapeHtml(variable.name)}" placeholder="Enter ${escapeHtml(variable.name)}" />
    `;
    inputsContainer.appendChild(group);
  });
  
  state.currentVariablePrompt = prompt;
  modal.classList.remove('hidden');
  inputsContainer.querySelector('.variable-input')?.focus();
}

// Close variable modal
function closeVariableModal() {
  document.getElementById('variable-modal').classList.add('hidden');
  state.currentVariablePrompt = null;
}

// Handle variable copy
async function handleVariableCopy() {
  if (!state.currentVariablePrompt) return;
  
  const inputs = document.querySelectorAll('.variable-input');
  const replacements = {};
  inputs.forEach(input => {
    replacements[input.dataset.variable] = input.value || `[${input.dataset.variable}]`;
  });
  
  let finalText = state.currentVariablePrompt.prompt;
  Object.keys(replacements).forEach(varName => {
    const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
    finalText = finalText.replace(regex, replacements[varName]);
  });
  
  try {
    await navigator.clipboard.writeText(finalText);
    state.currentVariablePrompt.lastUsed = Date.now();
    state.currentVariablePrompt.copyCount = (state.currentVariablePrompt.copyCount || 0) + 1;
    state.recent = state.recent.filter(id => id !== state.currentVariablePrompt.id);
    state.recent.unshift(state.currentVariablePrompt.id);
    state.recent = state.recent.slice(0, 3);
    await saveData();
    renderPrompts(); // Update copy count display
    closeVariableModal();
    
    // Visual feedback
    const copyBtn = document.querySelector(`[data-prompt-id="${state.currentVariablePrompt.id}"] .copy-prompt`);
    if (copyBtn) {
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 600);
    }
    
    showToast('Prompt copied to clipboard!', false, 'success');
  } catch (err) {
    showToast('Failed to copy prompt', true, 'error');
  }
}


// Search keyboard navigation
function handleSearchKeydown(e) {
  const cards = document.querySelectorAll('.prompt-card');
  if (cards.length === 0) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.searchFocusedIndex = Math.min(state.searchFocusedIndex + 1, cards.length - 1);
    highlightSearchResult(state.searchFocusedIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.searchFocusedIndex = Math.max(state.searchFocusedIndex - 1, -1);
    if (state.searchFocusedIndex >= 0) {
      highlightSearchResult(state.searchFocusedIndex);
    } else {
      clearSearchHighlight();
    }
  } else if (e.key === 'Enter' && state.searchFocusedIndex >= 0) {
    e.preventDefault();
    const focusedCard = cards[state.searchFocusedIndex];
    const promptId = focusedCard.dataset.promptId;
    const prompt = state.prompts.find(p => p.id === promptId);
    if (prompt) {
      copyPromptWithVariables(prompt);
      clearSearchHighlight();
    }
  }
}

// Highlight search result
function highlightSearchResult(index) {
  const cards = document.querySelectorAll('.prompt-card');
  cards.forEach((card, i) => {
    if (i === index) {
      card.style.borderColor = 'var(--color-coral)';
      card.style.boxShadow = '0 4px 16px rgba(255, 107, 107, 0.3)';
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }
  });
}

// Clear search highlight
function clearSearchHighlight() {
  const cards = document.querySelectorAll('.prompt-card');
  cards.forEach(card => {
    card.style.borderColor = '';
    card.style.boxShadow = '';
  });
  state.searchFocusedIndex = -1;
}

// Command palette
let commandPaletteOpen = false;

function toggleCommandPalette() {
  const palette = document.getElementById('command-palette');
  commandPaletteOpen = !commandPaletteOpen;
  
  if (commandPaletteOpen) {
    palette.classList.remove('hidden');
    document.getElementById('command-input').focus();
    updateCommandResults('');
  } else {
    palette.classList.add('hidden');
  }
}

function handleCommandInput(e) {
  updateCommandResults(e.target.value);
}

function updateCommandResults(query) {
  const resultsContainer = document.getElementById('command-results');
  resultsContainer.innerHTML = '';
  
  if (!query) {
    // Show all prompts
    state.prompts.slice(0, 10).forEach(prompt => {
      resultsContainer.appendChild(createCommandResultItem(prompt));
    });
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const filtered = state.prompts.filter(p => 
    p.title.toLowerCase().includes(lowerQuery) ||
    p.prompt.toLowerCase().includes(lowerQuery) ||
    p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  ).slice(0, 10);
  
  filtered.forEach(prompt => {
    resultsContainer.appendChild(createCommandResultItem(prompt));
  });
}

function createCommandResultItem(prompt) {
  const item = document.createElement('div');
  item.className = 'command-result-item';
  item.innerHTML = `
    <div class="command-result-item-title">${escapeHtml(prompt.title)}</div>
    <div class="command-result-item-preview">${escapeHtml(prompt.prompt.substring(0, 80))}...</div>
  `;
  item.addEventListener('click', () => {
    copyPromptWithVariables(prompt);
    toggleCommandPalette();
  });
  return item;
}

function handleCommandKeydown(e) {
  if (e.key === 'Escape') {
    toggleCommandPalette();
  }
}

// Global keyboard handler
function handleGlobalKeydown(e) {
  // Don't handle shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    // Allow ? key to show help even when typing
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      showKeyboardShortcutsHelp();
    }
    return;
  }
  
  // Ctrl/Cmd + K for command palette
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    toggleCommandPalette();
    return;
  }
  
  // ? key for shortcuts help
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    showKeyboardShortcutsHelp();
    return;
  }
  
  // Escape to close modals
  if (e.key === 'Escape') {
    closeAllModals();
    return;
  }
  
  // Number keys 1-9 to copy recent prompts
  if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const index = parseInt(e.key) - 1;
    const recentPrompts = state.recent
      .map(id => state.prompts.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 9);
    if (recentPrompts[index]) {
      e.preventDefault();
      copyPromptWithVariables(recentPrompts[index]);
    }
  }
}

// Keyboard shortcuts help
function showKeyboardShortcutsHelp() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeShortcutsModal() {
  document.getElementById('shortcuts-modal')?.classList.add('hidden');
}

// Quick add from clipboard
async function quickAddFromClipboard() {
  try {
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showToast('Clipboard API not available. Please ensure the extension has clipboard permissions.', true, 'error');
      return;
    }
    
    const text = await navigator.clipboard.readText();
    if (!text || text.trim().length === 0) {
      showToast('Clipboard is empty', true, 'error');
      return;
    }
    
    // Pre-fill prompt modal with clipboard content
    openPromptModal();
    
    // Use setTimeout to ensure modal is fully rendered
    setTimeout(() => {
      const textarea = document.getElementById('modal-prompt-textarea');
      if (textarea) {
        textarea.value = text;
        // Try to extract title from first line
        const firstLine = text.split('\n')[0].trim();
        if (firstLine.length > 0 && firstLine.length < 50) {
          const titleInput = document.getElementById('modal-title-input');
          if (titleInput) {
            titleInput.value = firstLine;
          }
        }
        // Focus the textarea for better UX
        textarea.focus();
        // Move cursor to end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  } catch (err) {
    console.error('Clipboard read error:', err);
    // More specific error messages
    if (err.name === 'NotAllowedError') {
      showToast('Clipboard access denied. Please grant clipboard permissions to the extension.', true, 'error');
    } else if (err.name === 'NotFoundError') {
      showToast('Clipboard is empty', true, 'error');
    } else {
      showToast(`Failed to read clipboard: ${err.message}`, true, 'error');
    }
  }
}

// Highlight search terms in text
function highlightSearchTerms(prompts, query) {
  if (!query) return;
  
  setTimeout(() => {
    const cards = document.querySelectorAll('.prompt-card');
    cards.forEach((card, index) => {
      if (prompts[index]) {
        const titleEl = card.querySelector('.prompt-card-title');
        const previewEl = card.querySelector('.prompt-card-preview');
        
        if (titleEl && titleEl.contentEditable !== 'true' && !titleEl.hasAttribute('data-highlighted')) {
          const original = titleEl.getAttribute('data-original-title') || titleEl.textContent.replace(/<[^>]*>/g, '');
          titleEl.setAttribute('data-original-title', original);
          const highlighted = highlightText(original, query);
          // Badge is separate now, so just update title
          titleEl.innerHTML = highlighted;
          titleEl.setAttribute('data-highlighted', 'true');
        }
        if (previewEl && !previewEl.hasAttribute('data-highlighted')) {
          const original = previewEl.textContent || previewEl.getAttribute('data-original') || '';
          previewEl.setAttribute('data-original', original);
          previewEl.innerHTML = highlightText(original, query);
          previewEl.setAttribute('data-highlighted', 'true');
        }
      }
    });
  }, 0);
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Debounced search
let searchDebounceTimer = null;
const debouncedRenderPrompts = debounce((query) => {
  renderPrompts(query);
}, 300);

function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(searchDebounceTimer);
      func(...args);
    };
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(later, wait);
  };
}

// Close modal functions
function closeTemplateLibrary() {
  document.getElementById('template-library-modal')?.classList.add('hidden');
}

function closeImportTextModal() {
  const modal = document.getElementById('import-text-modal');
  const textarea = document.getElementById('import-text-textarea');
  if (modal) modal.classList.add('hidden');
  if (textarea) textarea.value = '';
}

// Close all modals
function closeAllModals() {
  document.getElementById('prompt-modal')?.classList.add('hidden');
  document.getElementById('project-modal')?.classList.add('hidden');
  document.getElementById('variable-modal')?.classList.add('hidden');
  document.getElementById('command-palette')?.classList.add('hidden');
  document.getElementById('shortcuts-modal')?.classList.add('hidden');
  document.getElementById('archived-modal')?.classList.add('hidden');
  closeTemplateLibrary();
  closeImportTextModal();
  commandPaletteOpen = false;
  closeContextMenu();
  closePromptContextMenu();
}

// Prompt context menu
function showPromptContextMenu(e, prompt) {
  const menu = document.getElementById('prompt-context-menu');
  state.contextMenuPrompt = prompt;
  
  if (e.pageX && e.pageY) {
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
  } else {
    const rect = e.target.closest('.prompt-card')?.getBoundingClientRect();
    if (rect) {
      menu.style.left = (rect.right - 120) + 'px';
      menu.style.top = (rect.bottom + 5) + 'px';
    }
  }
  
  // Update favorite button text
  const favBtn = document.getElementById('prompt-context-favorite');
  if (favBtn) {
    favBtn.textContent = state.favorites.includes(prompt.id) ? 'Remove Favorite' : 'Add Favorite';
  }
  
  menu.classList.remove('hidden');
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      closePromptContextMenu();
      document.removeEventListener('click', closeMenu);
    }, { once: true });
  }, 0);
}

function closePromptContextMenu() {
  document.getElementById('prompt-context-menu')?.classList.add('hidden');
  state.contextMenuPrompt = null;
}

// Update empty state with contextual messages
function updateEmptyState(searchQuery = '', filtersActive = false) {
  const emptyState = document.getElementById('empty-state');
  if (!emptyState) return;
  
  const titleEl = emptyState.querySelector('.empty-title');
  const textEl = emptyState.querySelector('.empty-text');
  const iconEl = emptyState.querySelector('.empty-icon');
  
  if (searchQuery || filtersActive) {
    iconEl.textContent = '🔍';
    titleEl.textContent = 'No prompts found';
    if (searchQuery) {
      textEl.innerHTML = `Try different search terms or <button class="link-btn" onclick="document.getElementById('search-input').value=''; renderPrompts();">clear search</button>`;
    } else {
      textEl.textContent = 'Try adjusting your filters';
    }
  } else if (state.prompts.length === 0) {
    iconEl.textContent = '💡';
    titleEl.textContent = 'Create your first prompt!';
    textEl.innerHTML = 'Get started by creating a prompt. You can use variables like <code>{{topic}}</code> for dynamic content.';
  } else {
    iconEl.textContent = '📝';
    titleEl.textContent = 'No prompts found';
    textEl.textContent = 'Create your first prompt to get started!';
  }
}

// Setup inline editing for prompt titles
function setupInlineEdit(card, prompt) {
  const titleEl = card.querySelector('.prompt-card-title');
  if (!titleEl) return;
  
  let isEditing = false;
  
  titleEl.addEventListener('dblclick', () => {
    if (isEditing || titleEl.contentEditable === 'true') return;
    isEditing = true;
    titleEl.contentEditable = 'true';
    titleEl.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const finishEdit = () => {
      isEditing = false;
      titleEl.contentEditable = 'false';
      const newTitle = titleEl.textContent.trim();
      if (newTitle && newTitle !== prompt.title) {
        prompt.title = newTitle;
        saveData();
        showToast('Title updated!', false, 'success');
      } else {
        titleEl.textContent = prompt.title;
      }
      // Restore highlighting if needed
      const searchInput = document.getElementById('search-input');
      
      if (searchInput && searchInput.value) {
        const highlighted = highlightText(newTitle || prompt.title, searchInput.value);
        titleEl.innerHTML = highlighted;
        titleEl.setAttribute('data-highlighted', 'true');
      } else {
        titleEl.textContent = newTitle || prompt.title;
        titleEl.removeAttribute('data-highlighted');
      }
    };
    
    titleEl.addEventListener('blur', finishEdit, { once: true });
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit();
      } else if (e.key === 'Escape') {
        titleEl.textContent = prompt.title;
        finishEdit();
      }
    }, { once: true });
  });
}

// Show onboarding tour for first-time users
let tourStep = 0;
const tourSteps = [
  {
    target: '#new-prompt-btn',
    title: 'Create Your First Prompt',
    description: 'Click here to create a new prompt. You can organize prompts by projects and add tags for easy searching.',
    position: 'bottom'
  },
  {
    target: '#search-input',
    title: 'Search Prompts',
    description: 'Search through all your prompts by title, content, or tags. Use keyboard shortcuts (Ctrl+K) for quick access.',
    position: 'bottom'
  },
  {
    target: '#toggle-favorites-btn',
    title: 'Favorites',
    description: 'Star prompts you use frequently. Click this button to filter and show only your favorites.',
    position: 'bottom'
  },
  {
    target: '.prompt-card',
    title: 'Prompt Cards',
    description: 'Double-click a title to edit it quickly. Use the star to favorite, edit to modify, or archive to remove from view.',
    position: 'top'
  },
  {
    target: '#filter-bar',
    title: 'Tag Filters',
    description: 'Click on any tag to filter prompts. Active filters are highlighted. Clear them by clicking again.',
    position: 'top'
  }
];

function startOnboardingTour() {
  if (!state.firstTimeUser) return;
  
  const tour = document.getElementById('onboarding-tour');
  if (!tour) return;
  
  tour.classList.remove('hidden');
  tourStep = 0;
  showTourStep(0);
}

function showTourStep(step) {
  if (step >= tourSteps.length) {
    finishTour();
    return;
  }
  
  const stepData = tourSteps[step];
  const target = document.querySelector(stepData.target);
  const tooltip = document.getElementById('tour-tooltip');
  const title = document.getElementById('tour-title');
  const description = document.getElementById('tour-description');
  const nextBtn = document.getElementById('tour-next');
  
  if (!target || !tooltip) {
    finishTour();
    return;
  }
  
  title.textContent = stepData.title;
  description.textContent = stepData.description;
  
  if (step === tourSteps.length - 1) {
    nextBtn.textContent = 'Finish';
  } else {
    nextBtn.textContent = 'Next';
  }
  
  // Position tooltip
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top, left;
    
    if (stepData.position === 'bottom') {
      top = rect.bottom + 20;
      left = Math.max(10, Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, viewportWidth - tooltipRect.width - 10));
    } else {
      top = rect.top - tooltipRect.height - 20;
      left = Math.max(10, Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, viewportWidth - tooltipRect.width - 10));
    }
    
    // Ensure tooltip stays in viewport
    if (top < 10) top = rect.bottom + 20;
    if (top + tooltipRect.height > viewportHeight - 10) {
      top = rect.top - tooltipRect.height - 20;
    }
    
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }, 10);
  
  // Highlight target
  target.classList.add('tour-highlight');
  
  // Scroll into view if needed
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function nextTourStep() {
  // Remove highlight from current step
  const currentTarget = document.querySelector(tourSteps[tourStep]?.target);
  if (currentTarget) {
    currentTarget.classList.remove('tour-highlight');
  }
  
  tourStep++;
  showTourStep(tourStep);
}

function skipTour() {
  finishTour();
}

function finishTour() {
  // Remove all highlights
  document.querySelectorAll('.tour-highlight').forEach(el => {
    el.classList.remove('tour-highlight');
  });
  
  const tour = document.getElementById('onboarding-tour');
  if (tour) {
    tour.classList.add('hidden');
  }
  
  state.firstTimeUser = false;
  saveData();
}

// Setup tags autocomplete
function setupTagsAutocomplete() {
  const tagsInput = document.getElementById('modal-tags-input');
  if (!tagsInput) return;
  
  let autocompleteContainer = document.getElementById('tags-autocomplete');
  if (!autocompleteContainer) {
    autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'tags-autocomplete';
    autocompleteContainer.className = 'tags-autocomplete hidden';
    tagsInput.parentElement.appendChild(autocompleteContainer);
  }
  
  tagsInput.addEventListener('input', (e) => {
    const value = e.target.value;
    const lastComma = value.lastIndexOf(',');
    const currentTag = value.substring(lastComma + 1).trim();
    
    if (currentTag.length > 0) {
      const suggestions = getTagSuggestions(currentTag);
      showTagSuggestions(suggestions, currentTag);
    } else {
      autocompleteContainer.classList.add('hidden');
    }
  });
  
  tagsInput.addEventListener('blur', () => {
    setTimeout(() => autocompleteContainer.classList.add('hidden'), 200);
  });
}

function getTagSuggestions(input) {
  const allTags = [...PREDEFINED_TAGS];
  state.prompts.forEach(p => {
    p.tags.forEach(tag => {
      if (!allTags.includes(tag)) {
        allTags.push(tag);
      }
    });
  });
  
  return allTags.filter(tag => 
    tag.toLowerCase().includes(input.toLowerCase()) && 
    tag.toLowerCase() !== input.toLowerCase()
  ).slice(0, 5);
}

function showTagSuggestions(suggestions, currentInput) {
  const container = document.getElementById('tags-autocomplete');
  if (!container) return;
  
  if (suggestions.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.innerHTML = suggestions.map(tag => 
    `<div class="tag-suggestion" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</div>`
  ).join('');
  
  container.classList.remove('hidden');
  
  container.querySelectorAll('.tag-suggestion').forEach(item => {
    item.addEventListener('click', () => {
      const tagsInput = document.getElementById('modal-tags-input');
      const value = tagsInput.value;
      const lastComma = value.lastIndexOf(',');
      const before = value.substring(0, lastComma + 1);
      const after = value.substring(lastComma + 1).replace(/[^,]*$/, '');
      tagsInput.value = (before + after + item.dataset.tag + ', ').trim();
      container.classList.add('hidden');
      tagsInput.focus();
    });
  });
}

// Render search filters UI
function renderSearchFilters() {
  const filterBar = document.querySelector('.filter-bar');
  if (!filterBar) return;
  
  // Create sort dropdown (custom dropdown matching tag filter style)
  let sortDropdown = document.getElementById('sort-dropdown');
  if (!sortDropdown) {
    // Find the right position (before archive button)
    const archiveBtn = filterBar.querySelector('#show-archived-btn');
    
    sortDropdown = document.createElement('div');
    sortDropdown.id = 'sort-dropdown';
    sortDropdown.className = 'tag-filter-dropdown';
    
    // Insert before archive button, or append if archive button doesn't exist
    if (archiveBtn) {
      filterBar.insertBefore(sortDropdown, archiveBtn);
    } else {
      filterBar.appendChild(sortDropdown);
    }
    
    const button = document.createElement('button');
    button.className = 'tag-filter-button';
    button.innerHTML = `
      <span class="tag-filter-button-text">Sort</span>
      <svg class="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sortDropdown.classList.toggle('open');
      const menu = sortDropdown._menu;
      if (menu) {
        if (isOpen) {
          menu.classList.remove('hidden');
          setTimeout(() => updateDropdownPosition(sortDropdown, button), 0);
        } else {
          menu.classList.add('hidden');
        }
      }
    });
    sortDropdown.appendChild(button);
    
    const menu = document.createElement('div');
    menu.className = 'tag-filter-menu hidden';
    document.body.appendChild(menu);
    sortDropdown._menu = menu;
    
    // Close dropdown when clicking outside
    function closeSortDropdown(e) {
      if (!sortDropdown.contains(e.target) && !menu.contains(e.target)) {
        sortDropdown.classList.remove('open');
        menu.classList.add('hidden');
        document.removeEventListener('click', closeSortDropdown);
      }
    }
    sortDropdown._closeListener = closeSortDropdown;
  }
  
  // Update sort dropdown content
  const sortOptions = [
    { value: 'lastUsed', label: 'Recent' },
    { value: 'copyCount', label: 'Most Used' },
    { value: 'title', label: 'Title' },
    { value: 'created', label: 'Newest' }
  ];
  
  const menu = sortDropdown._menu;
  const button = sortDropdown.querySelector('.tag-filter-button');
  const buttonText = button.querySelector('.tag-filter-button-text');
  
  // Update button text
  const currentOption = sortOptions.find(opt => opt.value === state.sortBy);
  buttonText.textContent = currentOption ? currentOption.label : 'Sort';
  
  // Build menu
  menu.innerHTML = '';
    sortOptions.forEach(option => {
    const isActive = state.sortBy === option.value;
    const item = document.createElement('button');
    item.className = `tag-filter-item ${isActive ? 'active' : ''}`;
    item.type = 'button';
    item.innerHTML = `<span class="tag-filter-item-label">${escapeHtml(option.label)}</span>`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      state.sortBy = option.value;
      saveData();
      renderPrompts();
      renderSearchFilters(); // Update dropdown to reflect new selection
      sortDropdown.classList.remove('open');
      menu.classList.add('hidden');
    });
    menu.appendChild(item);
  });
  
  // Update menu visibility and position
  const isOpen = sortDropdown.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('hidden');
    updateDropdownPosition(sortDropdown, button);
  } else {
    menu.classList.add('hidden');
  }
  
  // Update close listener
  if (sortDropdown._closeListener) {
    document.removeEventListener('click', sortDropdown._closeListener);
  }
  sortDropdown._closeListener = function closeSortDropdown(e) {
    if (!sortDropdown.contains(e.target) && !menu.contains(e.target)) {
      sortDropdown.classList.remove('open');
      menu.classList.add('hidden');
      document.removeEventListener('click', sortDropdown._closeListener);
    }
  };
  document.addEventListener('click', sortDropdown._closeListener);
  
  // Render tag filters
  renderTagFilters();
}

// Render tag filter dropdown
function renderTagFilters() {
  const container = document.getElementById('tag-filters');
  if (!container) return;
  
  // Get all unique tags from non-archived prompts
  const allTags = new Set();
  state.prompts
    .filter(p => !state.archivedPrompts.includes(p.id))
    .forEach(p => {
      p.tags.forEach(tag => allTags.add(tag));
    });
  
  const sortedTags = Array.from(allTags).sort();
  
  // Create or update dropdown
  let dropdown = container.querySelector('.tag-filter-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'tag-filter-dropdown';
    container.appendChild(dropdown);
    
    const button = document.createElement('button');
    button.className = 'tag-filter-button';
    button.innerHTML = `
      <span class="tag-filter-button-text">Filter by tags</span>
      <svg class="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      const menu = dropdown._menu;
      if (menu) {
        if (isOpen) {
          menu.classList.remove('hidden');
          setTimeout(() => updateDropdownPosition(dropdown, button), 0);
        } else {
          menu.classList.add('hidden');
        }
      }
    });
    dropdown.appendChild(button);
    
    const menu = document.createElement('div');
    menu.className = 'tag-filter-menu hidden';
    // Append menu to body for proper z-index stacking
    document.body.appendChild(menu);
    dropdown._menu = menu; // Store reference
  }
  
  const menu = dropdown._menu;
  const button = dropdown.querySelector('.tag-filter-button');
  const buttonText = button.querySelector('.tag-filter-button-text');
  
  // Update button text
  if (state.searchFilters.tags.length > 0) {
    buttonText.textContent = `${state.searchFilters.tags.length} tag${state.searchFilters.tags.length > 1 ? 's' : ''} selected`;
  } else {
    buttonText.textContent = 'Filter by tags';
  }
  
  // Build menu
  menu.innerHTML = '';
  
  if (sortedTags.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tag-filter-empty';
    empty.textContent = 'No tags available';
    menu.appendChild(empty);
  } else {
    sortedTags.forEach(tag => {
      const isActive = state.searchFilters.tags.includes(tag);
      const item = document.createElement('button');
      item.className = `tag-filter-item ${isActive ? 'active' : ''}`;
      item.type = 'button';
      item.innerHTML = `<span class="tag-filter-item-label">${escapeHtml(tag)}</span>`;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTagFilter(tag);
      });
      menu.appendChild(item);
    });
    
    if (state.searchFilters.tags.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'tag-filter-divider';
      menu.appendChild(divider);
      
      const clearBtn = document.createElement('button');
      clearBtn.className = 'tag-filter-clear-all';
      clearBtn.textContent = 'Clear all';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTagFilters();
        dropdown.classList.remove('open');
        menu.classList.add('hidden');
      });
      menu.appendChild(clearBtn);
    }
  }
  
  // Update menu visibility and position
  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('hidden');
    updateDropdownPosition(dropdown, button);
  } else {
    menu.classList.add('hidden');
  }
  
  // Close dropdown when clicking outside
  function closeTagDropdown(e) {
    if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
      dropdown.classList.remove('open');
      menu.classList.add('hidden');
      document.removeEventListener('click', closeTagDropdown);
    }
  }
  
  // Remove old listener and add new one
  if (dropdown._closeListener) {
    document.removeEventListener('click', dropdown._closeListener);
  }
  dropdown._closeListener = closeTagDropdown;
  document.addEventListener('click', closeTagDropdown);
}

// Update dropdown menu position (for fixed positioning)
function updateDropdownPosition(dropdown, button) {
  const menu = dropdown._menu;
  if (!menu || !button) return;
  
  const buttonRect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth || 600;
  const viewportHeight = window.innerHeight || 600;
  
  let top = buttonRect.bottom + 4;
  let left = buttonRect.left;
  let width = Math.max(180, Math.min(250, buttonRect.width));
  
  // Adjust if menu would go off right edge
  if (left + width > viewportWidth - 10) {
    left = viewportWidth - width - 10;
  }
  
  // Adjust if menu would go off bottom edge
  const menuHeight = menu.offsetHeight || 250;
  if (top + menuHeight > viewportHeight - 10) {
    top = buttonRect.top - menuHeight - 4;
    if (top < 10) {
      top = 10;
      menu.style.maxHeight = (viewportHeight - top - 10) + 'px';
    }
  }
  
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
  menu.style.width = width + 'px';
  menu.style.maxHeight = '250px'; // Reset max-height
}

// Toggle tag filter
function toggleTagFilter(tag) {
  const index = state.searchFilters.tags.indexOf(tag);
  if (index > -1) {
    state.searchFilters.tags.splice(index, 1);
  } else {
    state.searchFilters.tags.push(tag);
  }
  renderTagFilters();
  renderPrompts();
}

// Clear all tag filters
function clearTagFilters() {
  state.searchFilters.tags = [];
  renderTagFilters();
  renderPrompts();
}

// Open archived prompts modal
function openArchivedModal() {
  const modal = document.getElementById('archived-modal');
  const list = document.getElementById('archived-prompts-list');
  
  if (!modal || !list) return;
  
  const archived = state.prompts.filter(p => state.archivedPrompts.includes(p.id));
  
  if (archived.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No archived prompts</p></div>';
  } else {
    list.innerHTML = archived.map(prompt => `
      <div class="archived-prompt-item">
        <div class="archived-prompt-info">
          <h4>${escapeHtml(prompt.title)}</h4>
          <p class="archived-prompt-preview">${escapeHtml(prompt.prompt.substring(0, 100))}...</p>
          <div class="archived-prompt-tags">
            ${prompt.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
        <div class="archived-prompt-actions">
          <button class="btn btn-small btn-secondary restore-prompt" data-prompt-id="${prompt.id}">
            <svg class="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Restore
          </button>
          <button class="btn btn-small btn-danger delete-prompt" data-prompt-id="${prompt.id}">
            <svg class="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    list.querySelectorAll('.restore-prompt').forEach(btn => {
      btn.addEventListener('click', () => restorePrompt(btn.dataset.promptId));
    });
    
    list.querySelectorAll('.delete-prompt').forEach(btn => {
      btn.addEventListener('click', () => deletePrompt(btn.dataset.promptId));
    });
  }
  
  modal.classList.remove('hidden');
}

function closeArchivedModal() {
  document.getElementById('archived-modal')?.classList.add('hidden');
}

// ========== NEW FEATURES ==========

// 1. PROMPT TEMPLATES/LIBRARY
function getDefaultTemplates() {
  return [
    {
      id: 'email-cold',
      name: 'Cold Email Opener',
      category: 'Email',
      description: 'Professional cold email introduction',
      prompt: 'Write a compelling 3-line cold email opener for [product/service] targeting [audience]. Make it personal and value-driven.',
      tags: ['Email', 'Sales', 'Outreach'],
      variables: ['product/service', 'audience']
    },
    {
      id: 'blog-intro',
      name: 'Blog Post Introduction',
      category: 'Content',
      description: 'Engaging blog post opening',
      prompt: 'Create an engaging introduction for a blog post about [topic]. Start with a hook that captures attention using storytelling or surprising statistics.',
      tags: ['Blog', 'Content', 'Writing'],
      variables: ['topic']
    },
    {
      id: 'social-post',
      name: 'Social Media Post',
      category: 'Social',
      description: 'Viral social media content',
      prompt: 'Write a viral [platform] post about [topic] that will get high engagement. Start with a bold statement or question that makes people curious. Include a call-to-action.',
      tags: ['Social', 'X', 'Marketing'],
      variables: ['platform', 'topic']
    },
    {
      id: 'code-comment',
      name: 'Code Documentation',
      category: 'Code',
      description: 'Professional code documentation',
      prompt: 'Write clear, concise documentation comments for this code:\n\n[code]\n\nExplain the purpose, parameters, return values, and any important notes.',
      tags: ['Code', 'Dev', 'Documentation'],
      variables: ['code']
    },
    {
      id: 'meeting-agenda',
      name: 'Meeting Agenda',
      category: 'Business',
      description: 'Structured meeting agenda',
      prompt: 'Create a comprehensive meeting agenda for [meeting-type] meeting. Include:\n1. Objectives\n2. Discussion topics\n3. Action items\n4. Next steps\n\nTopic: [topic]',
      tags: ['Business', 'Meeting', 'Productivity'],
      variables: ['meeting-type', 'topic']
    },
    {
      id: 'product-description',
      name: 'Product Description',
      category: 'Marketing',
      description: 'Compelling product description',
      prompt: 'Write a compelling product description for [product-name]. Highlight:\n- Key features and benefits\n- Target audience\n- Unique selling points\n- Call-to-action',
      tags: ['Marketing', 'E-commerce', 'Sales'],
      variables: ['product-name']
    }
  ];
}

function openTemplateLibrary() {
  const modal = document.getElementById('template-library-modal');
  if (!modal) return;
  
  const templateList = document.getElementById('template-list');
  if (!templateList) return;
  
  // Group templates by category
  const byCategory = {};
  state.templates.forEach(template => {
    const cat = template.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(template);
  });
  
  templateList.innerHTML = '';
  
  Object.keys(byCategory).sort().forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'template-category';
    categoryDiv.innerHTML = `<h4 class="template-category-title">${escapeHtml(category)}</h4>`;
    const templatesDiv = document.createElement('div');
    templatesDiv.className = 'template-grid';
    
    byCategory[category].forEach(template => {
      const templateCard = document.createElement('div');
      templateCard.className = 'template-card';
      templateCard.innerHTML = `
        <div class="template-card-header">
          <h5>${escapeHtml(template.name)}</h5>
          <button class="btn btn-small btn-primary use-template" data-template-id="${template.id}">Use</button>
        </div>
        <p class="template-description">${escapeHtml(template.description || '')}</p>
        <div class="template-tags">
          ${template.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="template-preview">${escapeHtml(template.prompt.substring(0, 100))}...</div>
      `;
      templateCard.querySelector('.use-template').addEventListener('click', () => {
        useTemplate(template);
        modal.classList.add('hidden');
      });
      templatesDiv.appendChild(templateCard);
    });
    
    categoryDiv.appendChild(templatesDiv);
    templateList.appendChild(categoryDiv);
  });
  
  modal.classList.remove('hidden');
}

function useTemplate(template) {
  openPromptModal();
  const titleInput = document.getElementById('modal-title-input');
  const tagsInput = document.getElementById('modal-tags-input');
  const promptTextarea = document.getElementById('modal-prompt-textarea');
  
  if (titleInput) titleInput.value = template.name;
  if (tagsInput) tagsInput.value = template.tags.join(', ');
  if (promptTextarea) promptTextarea.value = template.prompt;
  
  // Focus on first variable if any
  if (template.variables && template.variables.length > 0) {
    setTimeout(() => {
      const firstVar = `{{${template.variables[0]}}}`;
      const textarea = promptTextarea;
      const start = textarea.value.indexOf(firstVar);
      if (start !== -1) {
        textarea.focus();
        textarea.setSelectionRange(start, start + firstVar.length);
      }
    }, 100);
  }
}

// 7. DUPLICATE DETECTION
function detectDuplicates(prompt) {
  const threshold = 0.8; // 80% similarity threshold
  const duplicates = [];
  
  state.prompts.forEach(existingPrompt => {
    if (existingPrompt.id === prompt.id) return; // Skip self
    
    const similarity = calculateSimilarity(
      prompt.prompt.toLowerCase(),
      existingPrompt.prompt.toLowerCase()
    );
    
    if (similarity >= threshold) {
      duplicates.push({
        prompt: existingPrompt,
        similarity: Math.round(similarity * 100)
      });
    }
  });
  
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

function calculateSimilarity(str1, str2) {
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function checkForDuplicatesBeforeSave(prompt) {
  const duplicates = detectDuplicates(prompt);
  if (duplicates.length > 0) {
    return confirm(
      `Found ${duplicates.length} similar prompt(s) (${duplicates[0].similarity}% similar):\n\n` +
      duplicates.slice(0, 3).map(d => `- ${d.prompt.title}`).join('\n') +
      '\n\nDo you want to save anyway?'
    );
  }
  return true;
}

function mergeDuplicates(sourceId, targetId) {
  const source = state.prompts.find(p => p.id === sourceId);
  const target = state.prompts.find(p => p.id === targetId);
  
  if (!source || !target) return;
  
  // Merge tags
  const mergedTags = [...new Set([...target.tags, ...source.tags])];
  target.tags = mergedTags;
  
  // Use higher copy count
  target.copyCount = Math.max(target.copyCount || 0, source.copyCount || 0);
  
  // Use most recent lastUsed
  target.lastUsed = Math.max(target.lastUsed || 0, source.lastUsed || 0);
  
  // Remove source prompt
  state.prompts = state.prompts.filter(p => p.id !== sourceId);
  state.archivedPrompts = state.archivedPrompts.filter(id => id !== sourceId);
  state.recent = state.recent.filter(id => id !== sourceId);
  state.favorites = state.favorites.filter(id => id !== sourceId);
  
  saveData();
  renderPrompts();
  showToast('Prompts merged successfully!', false, 'success');
}

function showDuplicateResults(prompt, duplicates) {
  const message = `Found ${duplicates.length} similar prompt(s):\n\n` +
    duplicates.map(d => `${d.prompt.title} (${d.similarity}% similar)`).join('\n') +
    '\n\nWould you like to merge any of these?';
  
  if (confirm(message)) {
    // Could open a merge modal here, for now just show the duplicates
    showToast(`Found ${duplicates.length} duplicate(s). Right-click to merge.`, false, 'info');
  }
}

// 8. RICH TEXT PREVIEW (removed preview button, keeping markdown rendering for potential future use)
function renderMarkdown(text) {
  // Simple markdown renderer
  let html = escapeHtml(text);
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// 12. ENHANCED ORGANIZATION
function updateProjectDisplay() {
  // This will be called when rendering projects to show icons, colors, etc.
  renderProjects();
}

function getProjectIcon(project) {
  if (project.icon) {
    return project.icon;
  }
  // Default icons based on project name
  const iconMap = {
    'general': '📁',
    'blogs': '📝',
    'x': '🐦',
    'code': '💻',
    'dev': '⚙️'
  };
  return iconMap[project.name.toLowerCase()] || '📂';
}

function getProjectColor(project) {
  if (project.color) {
    return project.color;
  }
  return null;
}

function getProjectStats(projectId) {
  const projectPrompts = state.prompts.filter(p => p.projectId === projectId && !state.archivedPrompts.includes(p.id));
  return {
    total: projectPrompts.length,
    favorites: projectPrompts.filter(p => state.favorites.includes(p.id)).length,
    totalCopies: projectPrompts.reduce((sum, p) => sum + (p.copyCount || 0), 0),
    lastUsed: projectPrompts.length > 0 
      ? Math.max(...projectPrompts.map(p => p.lastUsed || 0))
      : 0
  };
}

// 13. IMPORT FROM EXTERNAL SOURCES
async function importFromCSV(csvText) {
  try {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const titleIdx = headers.findIndex(h => h.includes('title'));
    const promptIdx = headers.findIndex(h => h.includes('prompt') || h.includes('content') || h.includes('text'));
    const tagsIdx = headers.findIndex(h => h.includes('tag'));
    const projectIdx = headers.findIndex(h => h.includes('project'));
    
    if (titleIdx === -1 || promptIdx === -1) {
      throw new Error('CSV must have "title" and "prompt" columns');
    }
    
    const imported = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const title = values[titleIdx]?.trim();
      const prompt = values[promptIdx]?.trim();
      
      if (!title || !prompt) continue;
      
      const tags = tagsIdx !== -1 ? values[tagsIdx]?.split(',').map(t => t.trim()).filter(Boolean) || [] : [];
      const projectName = projectIdx !== -1 ? values[projectIdx]?.trim() : 'general';
      
      // Find or create project
      let project = state.projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
      if (!project && projectName !== 'general') {
        project = {
          id: generateId(),
          name: projectName,
          locked: false,
          color: null,
          icon: null,
          description: '',
          parentId: null
        };
        state.projects.push(project);
      }
      const projectId = project ? project.id : 'general';
      
      const newPrompt = {
        id: generateId(),
        projectId,
        title,
        prompt,
        tags,
        lastUsed: 0,
        copyCount: 0,
        createdAt: Date.now(),
        version: 1
      };
      
      state.prompts.push(newPrompt);
      imported.push(newPrompt);
    }
    
    await saveData();
    renderProjects();
    renderPrompts();
    showToast(`Successfully imported ${imported.length} prompt(s)!`, false, 'success');
    return imported;
  } catch (error) {
    showToast(`Import failed: ${error.message}`, true, 'error');
    throw error;
  }
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function importFromPlainText(text) {
  try {
    // Try to parse as one prompt per line or section
    const lines = text.split('\n').filter(l => l.trim());
    const imported = [];
    
    // Simple heuristic: if text has clear separators, use them
    const separator = text.includes('---') ? '---' : 
                     text.includes('===') ? '===' :
                     text.includes('\n\n\n') ? '\n\n\n' : null;
    
    if (separator) {
      const sections = text.split(separator).filter(s => s.trim());
      sections.forEach((section, idx) => {
        const lines = section.trim().split('\n');
        const title = lines[0].trim() || `Imported Prompt ${idx + 1}`;
        const prompt = lines.slice(1).join('\n').trim() || section.trim();
        
        if (prompt) {
          const newPrompt = {
            id: generateId(),
            projectId: 'general',
            title,
            prompt,
            tags: [],
            lastUsed: 0,
            copyCount: 0,
            createdAt: Date.now(),
            version: 1
          };
          state.prompts.push(newPrompt);
          imported.push(newPrompt);
        }
      });
    } else {
      // Single prompt
      const newPrompt = {
        id: generateId(),
        projectId: 'general',
        title: 'Imported Prompt',
        prompt: text.trim(),
        tags: [],
        lastUsed: 0,
        copyCount: 0,
        createdAt: Date.now(),
        version: 1
      };
      state.prompts.push(newPrompt);
      imported.push(newPrompt);
    }
    
    await saveData();
    renderPrompts();
    showToast(`Successfully imported ${imported.length} prompt(s)!`, false, 'success');
    return imported;
  } catch (error) {
    showToast(`Import failed: ${error.message}`, true, 'error');
    throw error;
  }
}

// ========== END NEW FEATURES ==========

