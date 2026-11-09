const prefix = '/daymotion-site/help/';

export function resolveHelpRoute({ pathname, explicitLanguage, savedLanguage, browserLanguages = [], catalog }) {
  const missing = { kind: 'notFound' };
  if (!pathname.startsWith(prefix) || /%|\\|\/\//.test(pathname)) return missing;
  let path = pathname.slice(prefix.length).replace(/(^|\/)index\.html$/, '$1').replace(/\/$/, '');
  let edition = catalog.defaultEdition, topic = '', requested = explicitLanguage;
  if (path.startsWith('editions/')) {
    const parts = path.split('/');
    if (parts.length < 3 || parts.length > 4) return missing;
    [, edition, requested, topic = ''] = parts;
    if (!/^[1-9][0-9]*$/.test(edition) || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(requested)) return missing;
  } else {
    topic = path;
  }
  const info = catalog.editions[edition];
  if (!info || (topic && !catalog.topics.includes(topic))) return missing;
  const languages = Object.keys(info.languages).filter(l => info.languages[l].complete);
  function match(value) {
    if (typeof value !== 'string') return undefined;
    const lower = value.toLowerCase();
    return languages.find(l => l.toLowerCase() === lower)
      ?? languages.find(l => l.toLowerCase() === lower.split('-')[0]);
  }
  const preferred = requested ? [requested] : savedLanguage ? [savedLanguage] : browserLanguages;
  const found = preferred.map(match).find(Boolean);
  const language = found ?? 'en';
  const fallback = Boolean(requested && !found);
  return { kind: fallback ? 'languageFallback' : 'content', edition, language, topic, fallback };
}

export function helpDestination(route, currentURL) {
  const current = new URL(currentURL);
  const url = new URL(`${prefix}editions/${route.edition}/${route.language}/${route.topic ? route.topic + '/' : ''}`, current);
  const device = current.searchParams.get('device');
  if (['iphone', 'duo', 'ipad'].includes(device)) url.searchParams.set('device', device);
  url.hash = current.hash;
  if (route.fallback || current.searchParams.get('helpLanguageUnavailable') === '1') url.searchParams.set('helpLanguageUnavailable', '1');
  return url;
}

async function openHelp() {
  const response = await fetch(new URL('./catalog.json', import.meta.url));
  if (!response.ok) return;
  const catalog = await response.json();
  let savedLanguage;
  try { savedLanguage = localStorage.getItem('daymotion.help.language'); } catch { /* Storage is optional. */ }
  const route = resolveHelpRoute({ pathname: location.pathname, savedLanguage, browserLanguages: navigator.languages, catalog });
  if (route.kind === 'notFound') return;
  const destination = helpDestination(route, location.href);
  const current = location.pathname.replace(/index\.html$/, '');
  if (current !== destination.pathname) {
    location.replace(destination.href);
    return;
  }
  const main = document.querySelector('main');
  if (!main) return;
  if (new URL(location.href).searchParams.has('helpLanguageUnavailable')) {
    const notice = document.createElement('p');
    notice.className = 'page-section';
    notice.textContent = `The requested language is unavailable for Help Edition ${route.edition}. Showing English.`;
    main.prepend(notice);
  }
  if (route.edition !== catalog.defaultEdition) {
    const notice = document.createElement('p'); notice.className = 'page-section';
    notice.append('Help for an older version · ');
    const link = document.createElement('a');
    link.href = `${prefix}${route.topic ? route.topic + '/' : ''}`;
    const device = document.documentElement.dataset.helpDevice;
    if (['iphone', 'duo', 'ipad'].includes(device)) link.search = `?device=${device}`;
    link.textContent = 'View latest help'; notice.append(link); main.prepend(notice);
  }
}

if (typeof window !== 'undefined') openHelp().catch(() => { /* Static help remains usable offline. */ });
