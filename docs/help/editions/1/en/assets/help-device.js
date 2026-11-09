(function () {
  'use strict';
  const devices = ['iphone', 'duo', 'ipad'];
  const valid = value => devices.includes(value);
  function resolveDevice({ nativeDevice, explicitDevice, savedDevice, detectedDevice } = {}) {
    return [nativeDevice, explicitDevice, savedDevice, detectedDevice].find(valid) || 'iphone';
  }
  function detectDevice(userAgent) {
    if (/\biPad\b/i.test(userAgent)) return 'ipad';
    if (/\biPhone\b/i.test(userAgent)) return 'iphone';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { resolveDevice, detectDevice };
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const native = window.__daymotionHelp || {};
  const key = 'daymotion.help.device';
  function selection() {
    let savedDevice;
    try { savedDevice = localStorage.getItem(key); } catch { /* Storage is optional. */ }
    return resolveDevice({nativeDevice: native.device,
      explicitDevice: new URL(location.href).searchParams.get('device'), savedDevice,
      detectedDevice: detectDevice(navigator.userAgent)});
  }
  let device = selection();
  root.dataset.helpDevice = device;
  root.dataset.helpDevicePending = '';
  if (native.embedded) root.dataset.helpEmbedded = '';
  // Resolve relative links against this edition's root, including under file:.
  const script = document.currentScript;
  const editionRoot = script ? new URL('../', script.src) : new URL('./', location.href);
  function updateLinks() {
    document.querySelectorAll('a[href]').forEach(link => {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#') || link.hasAttribute('download')) return;
      const url = new URL(raw, location.href);
      const localHelp = url.protocol === editionRoot.protocol && url.host === editionRoot.host &&
        (url.pathname.startsWith(editionRoot.pathname) || url.pathname.includes('/help/'));
      if (!localHelp || !(/\/$|\/index\.html$/.test(url.pathname))) return;
      url.searchParams.set('device', device);
      link.href = url.href;
    });
  }
  function render() {
    root.dataset.helpDevice = device;
    document.querySelectorAll('img[data-help-src-iphone]').forEach(img => {
      const src = img.getAttribute('data-help-src-' + device);
      const alt = img.getAttribute('data-help-alt-' + device);
      if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
      if (alt !== null) img.alt = alt;
    });
    document.querySelectorAll('[data-help-device-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.helpDeviceChoice === device));
    });
    updateLinks();
    delete root.dataset.helpDevicePending;
  }
  function initialize() {
    document.querySelectorAll('[data-help-device-selector]').forEach(container => {
      if (native.embedded) { container.hidden = true; return; }
      container.classList.add('help-device-selector');
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', 'Device shown in Help');
      const labels = ['iPhone', 'iPhone Duo', 'iPad'];
      devices.forEach((value, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.helpDeviceChoice = value;
        const icon = document.createElement('span');
        icon.className = 'help-device-icon help-device-icon-' + value;
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, document.createTextNode(labels[index]));
        button.addEventListener('click', () => {
          device = value;
          try { localStorage.setItem(key, device); } catch { /* Links retain the selection. */ }
          const url = new URL(location.href);
          url.searchParams.set('device', device);
          try { history.replaceState(history.state, '', url.href); } catch { /* file: may restrict history. */ }
          render();
        });
        container.append(button);
      });
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
  window.addEventListener('popstate', () => { device = selection(); render(); });
  window.addEventListener('pageshow', () => { device = selection(); render(); });
})();
