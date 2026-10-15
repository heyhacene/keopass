// ========================================================
// KEOPASS BROWSER EXTENSION — POPUP SCRIPT
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  const unlockView = document.getElementById('unlockView');
  const vaultView = document.getElementById('vaultView');
  const btnLock = document.getElementById('btnLock');
  const txtEmail = document.getElementById('txtEmail');
  const txtPassword = document.getElementById('txtPassword');
  const btnUnlock = document.getElementById('btnUnlock');
  const unlockError = document.getElementById('unlockError');
  const currentDomainEl = document.getElementById('currentDomain');
  const matchingList = document.getElementById('matchingList');
  const genResult = document.getElementById('genResult');
  const btnRefreshGen = document.getElementById('btnRefreshGen');
  const btnCopyGen = document.getElementById('btnCopyGen');

  // Génération d'un mot de passe aléatoire fort (16 chars)
  function generatePassword(length = 16) {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*()-_=+[]{}';
    const all = uppers + lowers + numbers + symbols;

    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    let pass = '';
    pass += uppers[arr[0] % uppers.length];
    pass += lowers[arr[1] % lowers.length];
    pass += numbers[arr[2] % numbers.length];
    pass += symbols[arr[3] % symbols.length];

    for (let i = 4; i < length; i++) {
      pass += all[arr[i] % all.length];
    }

    // Mélange de Fisher-Yates
    const chars = pass.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  function refreshGeneratedPassword() {
    genResult.value = generatePassword(16);
  }

  btnRefreshGen.addEventListener('click', refreshGeneratedPassword);
  btnCopyGen.addEventListener('click', () => {
    navigator.clipboard.writeText(genResult.value);
    btnCopyGen.textContent = '✓ Copié';
    setTimeout(() => {
      btnCopyGen.textContent = 'Copier';
    }, 1500);
  });

  // Vérifier le statut de déverrouillage
  function checkStatus() {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (status) => {
      if (status && status.isUnlocked) {
        unlockView.style.display = 'none';
        vaultView.style.display = 'block';
        btnLock.style.display = 'block';
        loadActiveTabData();
      } else {
        unlockView.style.display = 'block';
        vaultView.style.display = 'none';
        btnLock.style.display = 'none';
      }
    });
  }

  // Déverrouiller le coffre
  btnUnlock.addEventListener('click', () => {
    const email = txtEmail.value.trim();
    const password = txtPassword.value;
    if (!email || !password) {
      unlockError.textContent = 'Veuillez renseigner votre email et mot de passe maître.';
      return;
    }

    unlockError.textContent = '';
    btnUnlock.textContent = 'Déchiffrement...';

    chrome.runtime.sendMessage({ action: 'UNLOCK', email, password }, (res) => {
      btnUnlock.textContent = 'Déverrouiller KeoPass';
      if (res && res.success) {
        checkStatus();
      } else {
        unlockError.textContent = res?.error || 'Erreur lors du déverrouillage.';
      }
    });
  });

  // Verrouiller
  btnLock.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'LOCK' }, () => {
      txtPassword.value = '';
      checkStatus();
    });
  });

  // Charger les identifiants de l'onglet actif
  function loadActiveTabData() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url) return;

      try {
        const url = new URL(activeTab.url);
        const domain = url.hostname.replace(/^www\./, '');
        currentDomainEl.textContent = domain;

        chrome.runtime.sendMessage(
          { action: 'GET_MATCHING_LOGINS', url: activeTab.url },
          (res) => {
            const matches = res?.matches || [];
            if (matches.length === 0) {
              matchingList.innerHTML = `
                <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                  Aucun compte enregistré pour ce domaine.
                </div>
              `;
            } else {
              let html = '';
              matches.forEach((m, idx) => {
                html += `
                  <div class="account-card">
                    <div class="account-info">
                      <div class="account-user">${m.username || 'Identifiant sans nom'}</div>
                    </div>
                    <button class="btn-fill" data-index="${idx}">Remplir</button>
                  </div>
                `;
              });
              matchingList.innerHTML = html;

              matchingList.querySelectorAll('.btn-fill').forEach((btn) => {
                btn.addEventListener('click', () => {
                  const idx = parseInt(btn.getAttribute('data-index'), 10);
                  const creds = matches[idx];
                  if (creds) {
                    fillActiveTab(creds.username, creds.password);
                  }
                });
              });
            }
          }
        );
      } catch (err) {
        currentDomainEl.textContent = 'Onglet non supporté';
      }
    });
  }

  // Remplir la page active
  function fillActiveTab(username, password) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) return;

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (u, p) => {
          const pass = document.querySelector('input[type="password"]');
          if (pass) {
            pass.value = p;
            pass.dispatchEvent(new Event('input', { bubbles: true }));
            pass.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const user = document.querySelector(
            'input[type="email"], input[type="text"], input[name*="user"], input[name*="login"], input[name*="email"]'
          );
          if (user) {
            user.value = u;
            user.dispatchEvent(new Event('input', { bubbles: true }));
            user.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        args: [username, password],
      });
    });
  }

  // Initialisation
  refreshGeneratedPassword();
  checkStatus();
});
