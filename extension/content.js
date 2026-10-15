// ========================================================
// KEOPASS BROWSER EXTENSION — CONTENT SCRIPT
// Détection automatique, autofill et proposition à la frappe
// ========================================================

(function () {
  'use strict';

  // Ne pas réinjecter si déjà présent
  if (window.__KEOPASS_CONTENT_LOADED__) return;
  window.__KEOPASS_CONTENT_LOADED__ = true;

  const currentUrl = window.location.href;
  const currentDomain = window.location.hostname.replace(/^www\./, '');

  let detectedPairs = [];
  let matchingLogins = [];

  // Demander les identifiants correspondants au background script
  function fetchMatchingLogins() {
    chrome.runtime.sendMessage(
      { action: 'GET_MATCHING_LOGINS', url: currentUrl },
      (response) => {
        if (response && response.matches) {
          matchingLogins = response.matches;
          scanInputs();
        }
      }
    );
  }

  // Trouver les champs de mot de passe et leurs identifiants associés
  function scanInputs() {
    const passwordInputs = document.querySelectorAll(
      'input[type="password"]:not([data-keopass-handled])'
    );

    passwordInputs.forEach((passInput) => {
      passInput.setAttribute('data-keopass-handled', 'true');

      // Trouver l'identifiant (email ou username) associé
      let userInput = null;
      const form = passInput.form || passInput.closest('form');

      if (form) {
        userInput = form.querySelector(
          'input[type="email"], input[type="text"], input[autocomplete="username"], input[name*="user"], input[name*="login"], input[name*="email"]'
        );
      }

      if (!userInput) {
        // Chercher dans les inputs précédents dans le DOM
        const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="password"])'));
        const index = allInputs.findIndex((el) => el.compareDocumentPosition(passInput) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (index > 0) {
          userInput = allInputs[index - 1];
        }
      }

      detectedPairs.push({ passInput, userInput, form });
      injectKeoBadge(passInput, userInput);
    });
  }

  // Injection du badge discret KeoPass dans le champ
  function injectKeoBadge(passInput, userInput) {
    const parent = passInput.parentElement;
    if (!parent) return;

    // Créer le bouton badge KeoPass
    const badge = document.createElement('div');
    badge.className = 'keopass-input-badge';
    badge.title = 'Remplir avec KeoPass';
    badge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    `;

    // Positionner le badge à droite de l'input
    const rect = passInput.getBoundingClientRect();
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAutofillMenu(passInput, userInput, badge);
    });

    // Insérer dans le DOM
    parent.style.position = parent.style.position || 'relative';
    parent.appendChild(badge);
  }

  // Afficher le menu flottant des identifiants disponibles
  function showAutofillMenu(passInput, userInput, badge) {
    // Supprimer les menus déjà ouverts
    document.querySelectorAll('.keopass-dropdown-menu').forEach((el) => el.remove());

    const menu = document.createElement('div');
    menu.className = 'keopass-dropdown-menu';

    if (matchingLogins.length === 0) {
      menu.innerHTML = `
        <div class="keopass-dropdown-header">
          <strong>KeoPass</strong>
        </div>
        <div class="keopass-dropdown-empty">
          Aucun identifiant enregistré pour ce site.
        </div>
      `;
    } else {
      let itemsHtml = `
        <div class="keopass-dropdown-header">
          <strong>KeoPass</strong> — Comptes pour ${currentDomain}
        </div>
      `;

      matchingLogins.forEach((acc, idx) => {
        itemsHtml += `
          <div class="keopass-dropdown-item" data-index="${idx}">
            <div class="keopass-item-title">${acc.username || 'Identifiant sans nom'}</div>
            <div class="keopass-item-sub">Remplir automatiquement</div>
          </div>
        `;
      });

      menu.innerHTML = itemsHtml;

      menu.querySelectorAll('.keopass-dropdown-item').forEach((itemEl) => {
        itemEl.addEventListener('click', () => {
          const idx = parseInt(itemEl.getAttribute('data-index'), 10);
          const creds = matchingLogins[idx];
          if (creds) {
            fillCredentials(userInput, passInput, creds.username, creds.password);
            menu.remove();
          }
        });
      });
    }

    document.body.appendChild(menu);

    const badgeRect = badge.getBoundingClientRect();
    menu.style.top = `${window.scrollY + badgeRect.bottom + 6}px`;
    menu.style.left = `${Math.max(10, window.scrollX + badgeRect.right - 260)}px`;

    // Fermer si clic ailleurs
    setTimeout(() => {
      const handleOutsideClick = (e) => {
        if (!menu.contains(e.target) && e.target !== badge) {
          menu.remove();
          document.removeEventListener('click', handleOutsideClick);
        }
      };
      document.addEventListener('click', handleOutsideClick);
    }, 50);
  }

  // Déclencheur natif universel compatible avec React, Vue, Angular et Vanilla JS
  function setNativeValue(element, value) {
    if (!element) return;
    try {
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
    } catch {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Remplissage sécurisé et déclenchement des événements DOM React/Angular
  function fillCredentials(userInput, passInput, username, password) {
    if (userInput && username) {
      setNativeValue(userInput, username);
    }

    if (passInput && password) {
      setNativeValue(passInput, password);
    }
  }

  // Écoute de l'action de remplissage depuis le popup de l'extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'AUTOFILL') {
      const { username, password } = request;
      const passInput = document.querySelector('input[type="password"]');
      let userInput = null;

      if (passInput) {
        const form = passInput.form || passInput.closest('form');
        if (form) {
          userInput = form.querySelector(
            'input[type="email"], input[type="text"], input[autocomplete="username"], input[name*="user"], input[name*="login"], input[name*="email"]'
          );
        }
      }

      if (!userInput) {
        userInput = document.querySelector(
          'input[type="email"], input[type="text"], input[autocomplete="username"], input[name*="user"], input[name*="login"], input[name*="email"]'
        );
      }

      fillCredentials(userInput, passInput, username, password);
      sendResponse({ success: true });
      return true;
    }
  });

  // Interception de la validation de formulaire (Capture à la frappe)
  function attachSubmitListeners() {
    document.addEventListener('submit', handleFormSubmit, true);
  }

  function handleFormSubmit(e) {
    const form = e.target;
    if (!form || !form.querySelector) return;

    const passInput = form.querySelector('input[type="password"]');
    if (!passInput || !passInput.value) return;

    const password = passInput.value;
    const userInput = form.querySelector(
      'input[type="email"], input[type="text"], input[name*="user"], input[name*="login"], input[name*="email"]'
    );
    const username = userInput ? userInput.value : '';

    if (!password) return;

    // Vérifier si cet identifiant existe déjà pour ne pas proposer en boucle
    const alreadySaved = matchingLogins.some(
      (m) => m.username === username && m.password === password
    );
    if (alreadySaved) return;

    // Afficher la notification de proposition d'enregistrement
    showSavePrompt(username, password);
  }

  // Bandeau flottant moderne pour enregistrer le mot de passe
  function showSavePrompt(username, password) {
    document.querySelectorAll('.keopass-save-prompt').forEach((el) => el.remove());

    const prompt = document.createElement('div');
    prompt.className = 'keopass-save-prompt';
    prompt.innerHTML = `
      <div class="keopass-prompt-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
      <div class="keopass-prompt-content">
        <div class="keopass-prompt-title">Enregistrer dans KeoPass ?</div>
        <div class="keopass-prompt-desc">
          Voulez-vous mémoriser le mot de passe pour <strong>${currentDomain}</strong> (${username || 'ce compte'}) ?
        </div>
      </div>
      <div class="keopass-prompt-actions">
        <button type="button" class="keopass-btn-save">Enregistrer</button>
        <button type="button" class="keopass-btn-ignore">Ignorer</button>
      </div>
    `;

    document.body.appendChild(prompt);

    prompt.querySelector('.keopass-btn-save').addEventListener('click', () => {
      chrome.runtime.sendMessage(
        {
          action: 'SAVE_LOGIN',
          domain: currentDomain,
          url: currentUrl,
          username,
          password,
        },
        (res) => {
          prompt.innerHTML = `
            <div class="keopass-prompt-content" style="padding: 10px 14px; color: #16a34a; font-weight: bold;">
              ✓ Enregistré avec succès dans votre coffre KeoPass !
            </div>
          `;
          setTimeout(() => prompt.remove(), 2500);
        }
      );
    });

    prompt.querySelector('.keopass-btn-ignore').addEventListener('click', () => {
      prompt.remove();
    });
  }

  // Démarrage
  fetchMatchingLogins();
  scanInputs();
  attachSubmitListeners();

  // Observer les changements dynamiques du DOM (ex: Single Page Applications)
  const observer = new MutationObserver(() => {
    scanInputs();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
