// State and elements
const screens = {
    home : document.getElementById('screen-home'),
    browse : document.getElementById('screen-browse'),
    details : document.getElementById('screen-details'),
    manual : document.getElementById('screen-manual'),
    submit : document.getElementById('screen-submit'),
    api : document.getElementById('screen-api'),
    credits : document.getElementById('screen-credits'),
};

// Browse UI
const segFirmware = document.getElementById('segFirmware');
const segApps = document.getElementById('segApps');
const bundleSelect = document.getElementById('bundleSelect');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const resultsTitle = document.getElementById('resultsTitle');
const table = document.getElementById('resultsTable');
const tbody = table.querySelector('tbody');
const emptyState = document.getElementById('emptyState');
const tableWrap = document.getElementById('tableWrap');

// Details UI
const backToList = document.getElementById('backToList');
const detailsTitle = document.getElementById('detailsTitle');
const detailsList = document.getElementById('detailsList');
const openUrlBtn = document.getElementById('openUrl');
const copyUrlBtn = document.getElementById('copyUrl');

// Submit UI
const submitForm = document.getElementById('submitForm');
const urlInput = document.getElementById('urlInput');
const submitBtn = document.getElementById('submitBtn');
const submitMessage = document.getElementById('submitMessage');

// Toast
const toast = document.getElementById('toast');

// Data cache
let firmwareList = {};
let appsList = {};
const cache = new Map(); // key: `/database/${type}/${bundle}.json` -> array

// Router
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
    // Preload lists
    try
    {
        [firmwareList, appsList] = await Promise.all([
            fetch('/database/firmware.json').then(r => r.json()),
            fetch('/database/apps.json').then(r => r.json()),
        ]);
    }
    catch (e)
    {
        console.error('Failed to load index lists', e);
    }
    route();
});

function route()
{
    const url = new URL(location.href);
    const hash = url.hash || '#/home';
    const [path, qs] = hash.split('?');
    const params = new URLSearchParams(qs || '');

    // Hide all
    for (const s of Object.values(screens))
        s.classList.add('hidden');

    switch (true)
    {
    case path.startsWith('#/browse'):
        screens.browse.classList.remove('hidden');
        const type = (params.get('type') === 'apps') ? 'apps' : 'firmware';
        setSegment(type);
        initBrowse(type, params.get('bundle'), params.get('q'));
        break;
    case path.startsWith('#/details'):
        screens.details.classList.remove('hidden');
        showDetailsFromParams(params);
        break;
    case path.startsWith('#/manual'):
        screens.manual.classList.remove('hidden');
        break;
    case path.startsWith('#/submit'):
        screens.submit.classList.remove('hidden');
        break;
    case path.startsWith('#/api'):
        screens.api.classList.remove('hidden');
        break;
    case path.startsWith('#/credits'):
        screens.credits.classList.remove('hidden');
        break;
    default:
        screens.home.classList.remove('hidden');
    }
}

function setSegment(type)
{
    segFirmware.setAttribute('aria-selected', String(type === 'firmware'));
    segApps.setAttribute('aria-selected', String(type === 'apps'));
}

segFirmware.addEventListener('click', () => navigateToBrowse('firmware'));
segApps.addEventListener('click', () => navigateToBrowse('apps'));
refreshBtn.addEventListener('click', () => {
    const p = readBrowseParams();
    cache.delete(`/database/${p.type}/${p.bundle}.json`);
    initBrowse(p.type, p.bundle, searchInput.value.trim());
});

function navigateToBrowse(type, bundle)
{
    const params = new URLSearchParams();
    params.set('type', type);
    if (bundle)
        params.set('bundle', bundle);
    const q = searchInput.value.trim();
    if (q)
        params.set('q', q);
    location.hash = `#/browse?${params.toString()}`;
}

function readBrowseParams()
{
    const hash = location.hash;
    const [, qs] = hash.split('?');
    const p = new URLSearchParams(qs || '');
    return {
        type : (p.get('type') === 'apps') ? 'apps' : 'firmware',
        bundle : p.get('bundle') || '',
    };
}

function isValidUrl(s)
{
    if (!s)
        return false;
    try
    {
        const u = new URL(s);
        return u.protocol === "http:" || u.protocol === "https:";
    }
    catch (_)
    {
        return false;
    }
}

// Helper: uploadedToMillis
function uploadedToMillis(v)
{
    if (v === null || v === undefined)
        return null;
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    const s = String(v).trim();
    if (!s)
        return null;

    // Numeric string (epoch seconds or milliseconds, or sortable build number)
    const n = Number(s);
    if (!Number.isNaN(n) && Number.isFinite(n))
        return n;

    // Date string
    const t = Date.parse(s);
    if (!Number.isNaN(t))
        return t;

    return null;
}

// Helper: dedupeByMd5KeepOldest
function dedupeByMd5KeepOldest(items)
{
    const bestByMd5 = new Map();
    const passthrough = [];

    for (const it of (items || []))
    {
        const md5 = (it && it.md5 !== undefined && it.md5 !== null) ? String(it.md5).trim() : '';
        if (!md5)
        {
            passthrough.push(it);
            continue;
        }

        const cur = bestByMd5.get(md5);
        if (!cur)
        {
            bestByMd5.set(md5, it);
            continue;
        }

        const curT = uploadedToMillis(cur.uploaded);
        const itT = uploadedToMillis(it.uploaded);

        // Keep the oldest (smallest) uploaded time
        if (curT === null && itT === null)
        {
            // Keep existing
            continue;
        }
        if (curT === null && itT !== null)
        {
            bestByMd5.set(md5, it);
            continue;
        }
        if (curT !== null && itT === null)
        {
            continue;
        }
        if (itT < curT)
        {
            bestByMd5.set(md5, it);
        }
    }

    return passthrough.concat(Array.from(bestByMd5.values()));
}

async function initBrowse(type, bundleId, q)
{
    // Populate selector
    populateBundleSelect(type, bundleId);

    resultsTitle.textContent = '';
    tbody.innerHTML = '';
    emptyState.hidden = true;

    if (!bundleId)
    {
        resultsTitle.textContent = `Select a ${type === 'firmware' ? 'device' : 'app'} to view versions`;
        return;
    }

    const title = (type === 'firmware') ? (firmwareList[bundleId]?.title?.join(', ') || bundleId) : (appsList[bundleId] || bundleId);
    resultsTitle.textContent = `${title} — ${type === 'firmware' ? 'Firmware Versions' : 'App Versions'}`;

    const key = `/database/${type}/${bundleId}.json`;
    let data = cache.get(key);
    // Ensure cached data is deduplicated by MD5, keeping the oldest upload
    if (data)
        data = dedupeByMd5KeepOldest(data);
    if (!data)
    {
        tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
        try
        {
            data = await fetch(key).then(r => r.json());
            data = dedupeByMd5KeepOldest(data);
            cache.set(key, data);
        }
        catch (e)
        {
            tbody.innerHTML = `<tr><td colspan="4">Error loading data.</td></tr>`;
            return;
        }
    }

    // Apply search filter
    const query = (q || '').toLowerCase();
    if (query)
        searchInput.value = q;
    let filtered = data.filter(it =>
                                   it.versionName?.toLowerCase().includes(query) ||
                                   String(it.versionCode || '').toLowerCase().includes(query) ||
                                   (it.uploaded || '').toLowerCase().includes(query));

    renderTable(filtered, type, bundleId);
}

function populateBundleSelect(type, selected)
{
    bundleSelect.innerHTML = '';
    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = `— Select ${type === 'firmware' ? 'device' : 'app'} —`;
    bundleSelect.appendChild(optDefault);

    const source = (type === 'firmware') ? firmwareList : appsList;
    Object.keys(source)
        .sort((a, b) => {
            const ta = (type === 'firmware') ? source[a].title.join(', ') : source[a];
            const tb = (type === 'firmware') ? source[b].title.join(', ') : source[b];
            return ta.localeCompare(tb);
        })
        .forEach(id => {
            const o = document.createElement('option');
            o.value = id;
            o.textContent = (type === 'firmware') ? source[id].title.join(', ') : source[id];
            if (id === selected)
                o.selected = true;
            bundleSelect.appendChild(o);
        });

    bundleSelect.onchange = () => navigateToBrowse(type, bundleSelect.value);
}

function renderTable(rows, type, bundleId)
{
    // Clear any mobile cards
    const existingCards = tableWrap.querySelector('.mobile-cards');
    if (existingCards)
        existingCards.remove();

    if (!rows.length)
    {
        tbody.innerHTML = '';
        emptyState.hidden = false;
        return;
    }
    emptyState.hidden = true;

    // Default sort by uploaded (desc if looks like date or number)
    rows = sortRows(rows, 'uploaded', 'desc');

    tbody.innerHTML = rows.map((item, idx) => {
                              const viewHash = `#/details?type=${encodeURIComponent(type)}&bundle=${encodeURIComponent(bundleId)}&url=${encodeURIComponent(String(item.url || ''))}`;
                              // Inline-flex container for actions with small gap
                              return `
      <tr>
        <td>${escapeHtml(item.versionName)}</td>
        <td>${escapeHtml(String(item.versionCode))}</td>
        <td>${escapeHtml(String(item.uploaded))}</td>
        <td>
          <span style="display:inline-flex; gap:8px; align-items:center;">
            <a class="btn btn-ghost" href="${viewHash}">View</a>
            <a class="btn btn-primary" target="_blank" rel="noopener" href="${escapeAttr(item.url)}">Download</a>
          </span>
        </td>
      </tr>`;
                          })
                          .join('');

    // Mobile cards
    if (matchMedia('(max-width: 640px)').matches)
    {
        const list = document.createElement('div');
        list.className = 'mobile-cards';
        rows.forEach((item, idx) => {
            const viewHash = `#/details?type=${encodeURIComponent(type)}&bundle=${encodeURIComponent(bundleId)}&url=${encodeURIComponent(String(item.url || ''))}`;
            const card = document.createElement('div');
            card.className = 'mobile-card';
            // Actions as inline-flex with gap for horizontal layout
            card.innerHTML = `
        <div class="row"><strong>Version</strong><span>${escapeHtml(item.versionName)}</span></div>
        <div class="row"><strong>Code</strong><span>${escapeHtml(String(item.versionCode))}</span></div>
        <div class="row"><strong>Uploaded</strong><span>${escapeHtml(String(item.uploaded))}</span></div>
        <div class="actions" style="display:inline-flex; gap:8px; align-items:center; margin-top:8px;">
          <a class="btn btn-ghost" href="${viewHash}">View</a>
          <a class="btn btn-primary" target="_blank" rel="noopener" href="${escapeAttr(item.url)}">Download</a>
        </div>`;
            list.appendChild(card);
        });
        tableWrap.appendChild(list);
    }
}

function sortRows(rows, key, dir = 'asc')
{
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows ].sort((a, b) => {
        const va = a[key] ?? '';
        const vb = b[key] ?? '';
        const na = Number(va);
        const nb = Number(vb);
        if (!Number.isNaN(na) && !Number.isNaN(nb))
            return (na - nb) * mult;
        return String(va).localeCompare(String(vb)) * mult;
    });
}

// Sorting by header click
let currentSort = {key : 'uploaded', dir : 'desc'};
Array.from(table.tHead.querySelectorAll('th[data-sort]')).forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (currentSort.key === key)
            currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        else
            currentSort = {key, dir : 'asc'};

        const {type, bundle} = readBrowseParams();
        const keyPath = `/database/${type}/${bundle}.json`;
        const data = cache.get(keyPath) || [];
        renderTable(sortRows(data, currentSort.key, currentSort.dir), type, bundle);
    });
});

// Search (debounced)
let searchTimer = 0;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        const q = searchInput.value.trim();
        const params = new URLSearchParams(location.hash.split('?')[1] || '');
        if (q)
            params.set('q', q);
        else
            params.delete('q');
        location.hash = `#/browse?${params.toString()}`;
    }, 200);
});

// Details from params
function showDetailsFromParams(params)
{
    const type = (params.get('type') === 'apps') ? 'apps' : 'firmware';
    const bundle = params.get('bundle');
    const urlParam = params.get('url') || '';
    const i = Number(params.get('i')) || 0; // fallback for older hashes
    const key = `/database/${type}/${bundle}.json`;
    const title = (type === 'firmware') ? (firmwareList[bundle]?.title?.join(', ') || bundle) : (appsList[bundle] || bundle);

    const data = cache.get(key);
    if (!data)
    {
        // If not in cache yet, navigate back to list
        location.hash = `#/browse?type=${type}&bundle=${encodeURIComponent(bundle)}`;
        return;
    }

    let item = null;
    if (urlParam)
    {
        item = data.find(it => String(it.url || '') === urlParam) || null;
    }
    if (!item)
    {
        item = data[i] || null;
    }
    if (!item)
    {
        location.hash = `#/browse?type=${type}&bundle=${encodeURIComponent(bundle)}`;
        return;
    }

    detailsTitle.textContent = `${title} — Item Details`;
    detailsList.innerHTML = `
    <dt>Version Name</dt><dd>${escapeHtml(item.versionName)}</dd>
    <dt>Version Code</dt><dd>${escapeHtml(String(item.versionCode))}</dd>
    <dt>MD5</dt><dd>${escapeHtml(String(item.md5))}</dd>
    <dt>Uploaded</dt><dd>${escapeHtml(String(item.uploaded))}</dd>
    <dt>URL</dt><dd><a href="${escapeAttr(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.url)}</a></dd>
  `;

    openUrlBtn.href = item.url;
    copyUrlBtn.onclick = async () => {
        try
        {
            await navigator.clipboard.writeText(item.url);
            showToast('URL copied');
        }
        catch (_)
        {
            showToast('Copy failed');
        }
    };
}

backToList.addEventListener('click', () => {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    const type = (p.get('type') === 'apps') ? 'apps' : 'firmware';
    const bundle = p.get('bundle') || '';
    location.hash = `#/browse?type=${type}&bundle=${encodeURIComponent(bundle)}`;
});

// Submit form
submitForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const raw = urlInput.value || "";
    const urls = raw
                     .split(/\r?\n/)
                     .map(s => s.trim())
                     .filter(Boolean);

    if (!urls.length)
        return;

    submitBtn.disabled = true;
    urlInput.disabled = true;

    submitMessage.textContent = "";
    submitMessage.style.whiteSpace = "pre-wrap";

    let ok = 0;
    let fail = 0;
    const lines = [];

    for (const url of urls)
    {
        if (!isValidUrl(url))
        {
            fail += 1;
            lines.push(`${url} -> Invalid URL`);
            submitMessage.textContent = `Submitted ${ok + fail} of ${urls.length}\n` + lines.join("\n");
            continue;
        }

        try
        {
            const res = await fetch("https://api.ftvdb.com/submit-url", {
                method : "POST",
                headers : {"Content-Type" : "application/json"},
                body : JSON.stringify({url}),
            });

            let data = null;
            try
            {
                data = await res.json();
            }
            catch (_)
            {
                data = {error : true, message : "Invalid response"};
            }

            const isError = !res.ok || data?.error;
            if (isError)
            {
                fail += 1;
                lines.push(`${url} -> ${data?.message || "Submission failed."}`);
            }
            else
            {
                ok += 1;
                lines.push(`${url} -> ${data?.message || "Submitted."}`);
            }
        }
        catch (_)
        {
            fail += 1;
            lines.push(`${url} -> Submission failed.`);
        }

        submitMessage.textContent = `Submitted ${ok + fail} of ${urls.length}\n` + lines.join("\n");
    }

    submitMessage.style.color = fail ? "var(--danger)" : "var(--success)";
    submitMessage.textContent = `${ok} succeeded, ${fail} failed\n` + lines.join("\n");

    if (fail === 0)
    {
        urlInput.value = "";
        showToast("Thanks for contributing");
    }
    else if (ok > 0)
    {
        showToast("Some URLs submitted");
    }

    submitBtn.disabled = false;
    urlInput.disabled = false;
});

// Helpers
function showToast(text)
{
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
        toast.hidden = true;
    }, 2000);
}

function escapeHtml(s)
{
    return String(s).replace(/[&<>"']/g, c => ({'&' : '&amp;', '<' : '&lt;', '>' : '&gt;', '"' : '&quot;', '\'' : '&#39;'}[c]));
}
function escapeAttr(s)
{
    return escapeHtml(s).replace(/"/g, '&quot;');
}
