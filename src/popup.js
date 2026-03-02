// --- Helper Functions ---

async function displaySaved() {
  const { library = [] } = await chrome.storage.local.get('library');
  const savedList = document.getElementById('saved-list');
  if (!savedList) return;
  savedList.innerHTML = '';
  
  library.forEach((bm) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<b>${bm.name}</b> <button class="run-btn">Run</button>`;
    
    div.querySelector('.run-btn').onclick = () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          world: "MAIN", 
          func: (code) => {
            const s = document.createElement('script');
            // Decode and remove the javascript: prefix if it exists
            const cleanCode = decodeURIComponent(code).replace(/^javascript:/i, '');
            s.textContent = cleanCode;
            document.documentElement.appendChild(s);
            s.remove();
          },
          args: [bm.code]
        });
      });
    };
    savedList.appendChild(div);
  });
}

async function saveBookmarklet(bm) {
  const { library = [] } = await chrome.storage.local.get('library');
  if (!library.some(item => item.code === bm.code)) {
    library.push(bm);
    await chrome.storage.local.set({ library });
    displaySaved();
  }
}

// --- Main Logic ---

document.addEventListener('DOMContentLoaded', async () => {
  const SCRIPT_URL = "https://mohanisher47.github.io/script.js";
  const foundList = document.getElementById('found-list');
  foundList.innerHTML = '<i>Getting Bookmarklets ...</i>';

  // Load existing library
  displaySaved();

  try {
    // We fetch the script.js file directly because that's where the bookmarklet code lives
    const response = await fetch(SCRIPT_URL);
    const scriptText = await response.text();

    foundList.innerHTML = ''; 

    // This Regex looks for things like: .href = `javascript:...`
    // It captures the ID (like blookethacks) and the code inside the backticks
    const regex = /document\.getElementById\(['"](.+?)['"]\)\.href\s*=\s*[`'](javascript:.+?)[`']/g;
    let match;
    let foundAny = false;

    while ((match = regex.exec(scriptText)) !== null) {
      foundAny = true;
      const id = match[1];
      const code = match[2];
      
      // Clean up the name (e.g., "blookethacks" -> "Blooket Hacks")
      const name = id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

      const bm = { name, code };
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<span>${bm.name}</span> <button class="save-btn">Save</button>`;
      div.querySelector('.save-btn').onclick = () => saveBookmarklet(bm);
      foundList.appendChild(div);
    }

    if (!foundAny) {
      foundList.innerHTML = 'No bookmarklets found in script.js';
    }

  } catch (error) {
    foundList.innerHTML = '<span style="color:red">Error connecting to site.</span>';
    console.error(error);
  }
});