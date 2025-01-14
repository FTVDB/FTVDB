// Screens
const startupScreen = document.getElementById('startupScreen');
const selectionScreen = document.getElementById('selectionScreen');
const resultsScreen = document.getElementById('resultsScreen');
const detailsScreen = document.getElementById('detailsScreen');
const manualScreen = document.getElementById('manualScreen');
const submitScreen = document.getElementById('submitScreen');
const apiDocsScreen = document.getElementById('apiDocsScreen');
const creditsScreen = document.getElementById('creditsScreen');

// Nav
document.getElementById('homeLink').onclick = () => showScreen(startupScreen);
document.getElementById('manualLink').onclick = () => showScreen(manualScreen);
document.getElementById('submitLink').onclick = () => showScreen(submitScreen);
document.getElementById('apiLink').onclick = () => showScreen(apiDocsScreen);
document.getElementById('creditsLink').onclick = () => showScreen(creditsScreen);

// Buttons
const firmwareBtn = document.getElementById('firmwareBtn');
const appsBtn = document.getElementById('appsBtn');
const backToStartup = document.getElementById('backToStartup');
const backToSelection = document.getElementById('backToSelection');
const backToResults = document.getElementById('backToResults');

// Titles & data references
const selectionTitle = document.getElementById('selectionTitle');
const selectionDropdown = document.getElementById('selectionDropdown');
const resultsTitle = document.getElementById('resultsTitle');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const detailsTitle = document.getElementById('detailsTitle');
const detailsList = document.getElementById('detailsList');

// JSON data
let firmwareList = {};
let appsList = {};

// We store the "current item name" so we can display it in the results & details screens
let currentItemName = '';

// Fetch main JSON
(async () => {
    firmwareList = await fetch('/database/firmware.json').then(r => r.json());
    appsList = await fetch('/database/apps.json').then(r => r.json());
})().catch(console.error);

// Show/hide screen
function showScreen(screen)
{
    [startupScreen, selectionScreen, resultsScreen, detailsScreen, manualScreen, submitScreen, apiDocsScreen, creditsScreen].forEach(sec => sec.classList.add('hidden'));
    screen.classList.remove('hidden');
}

firmwareBtn.addEventListener('click', () => showSelection('firmware'));
appsBtn.addEventListener('click', () => showSelection('apps'));

/**
 * Show selection screen with dropdown for either firmware or app.
 * The user picks from the dropdown, then we load the corresponding bundle.
 */
function showSelection(type)
{
    showScreen(selectionScreen);
    selectionTitle.textContent = (type === 'firmware') ? 'Select a Device' : 'Select an App';

    selectionDropdown.innerHTML = '<option value="">-- Select an option --</option>';
    const source = (type === 'firmware') ? firmwareList : appsList;

    for (const bundle in source)
    {
        const option = document.createElement('option');
        option.value = bundle;
        option.textContent = (type === 'firmware') ? source[bundle].title.join(', ') : source[bundle];
        selectionDropdown.appendChild(option);
    }

    selectionDropdown.onchange = () => {
        if (selectionDropdown.value)
        {
            loadBundle(type, selectionDropdown.value);
        }
    };
}

/**
 * Load selected firmware/app bundle from the local JSON, build minimal table,
 * and display the item name in the results title.
 */
async function loadBundle(type, bundleId)
{
    showScreen(resultsScreen);

    // Figure out the "current item name" from the JSON
    if (type === 'firmware')
    {
        currentItemName = firmwareList[bundleId].title.join(', ');
    }
    else
    {
        currentItemName = appsList[bundleId];
    }

    // Display item name + whether it's firmware/app
    resultsTitle.textContent = `${currentItemName} - ${
        type === 'firmware' ? 'Firmware Versions' : 'App Versions'}`;

    resultsTableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    try
    {
        const data = await fetch(`/database/${type}/${bundleId}.json`).then(r => r.json());
        const rows = data.map((item, idx) => `
      <tr data-idx="${idx}">
        <td>${item.versionName}</td>
        <td>${item.versionCode}</td>
        <td>${item.uploaded}</td>
      </tr>
    `).join('');
        resultsTableBody.innerHTML = rows;

        // On row click, show details
        resultsTableBody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const index = tr.getAttribute('data-idx');
                showDetails(data[index]);
            });
        });
    }
    catch (err)
    {
        resultsTableBody.innerHTML = '<tr><td colspan="3">Error loading data.</td></tr>';
    }
}

/**
 * Show the details of one version entry, adding the item title to the details header.
 */
function showDetails(item)
{
    showScreen(detailsScreen);

    // e.g. "Fire TV Cube - 3rd Gen (2022) - Item Details"
    detailsTitle.textContent = `${currentItemName} - Item Details`;

    detailsList.innerHTML = `
    <dt>Version Name</dt>
    <dd>${item.versionName}</dd>
    <dt>Version Code</dt>
    <dd>${item.versionCode}</dd>
    <dt>MD5</dt>
    <dd>${item.md5}</dd>
    <dt>Uploaded</dt>
    <dd>${item.uploaded}</dd>
    <dt>URL</dt>
    <dd><a href="${item.url}" target="_blank" style="color:#72bfff;">${item.url}</a></dd>
  `;
}

// Back
backToStartup.onclick = () => showScreen(startupScreen);
backToSelection.onclick = () => showScreen(selectionScreen);
backToResults.onclick = () => showScreen(resultsScreen);

// Submit form
const submitForm = document.getElementById('submitForm');
const urlInput = document.getElementById('urlInput');
const submitMessage = document.getElementById('submitMessage');
submitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!urlInput.value)
        return;
    try
    {
        const res = await fetch('https://api.ftvdb.com/submit-url', {
            method : 'POST',
            headers : {'Content-Type' : 'application/json'},
            body : JSON.stringify({url : urlInput.value})
        });
        const data = await res.json();
        submitMessage.style.color = data.error ? 'red' : 'green';
        submitMessage.textContent = data.message;
    }
    catch (err)
    {
        submitMessage.style.color = 'red';
        submitMessage.textContent = 'Submission failed.';
    }
});
