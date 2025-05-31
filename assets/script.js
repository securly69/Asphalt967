"use strict";

const uvForm = document.getElementById("uv-form");
const uvAddress = document.getElementById("uv-address");
const navForm = document.getElementById("nav-bar-form");
const navAddress = document.getElementById("nav-bar-address");
const searchEngineInputs = document.querySelectorAll("#uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const rotatingText = document.getElementById('rotating-text');

const STORAGE_KEYS = {
  BOOKMARKS: 'madEggBrowser_bookmarks',
  SEARCH_ENGINE: 'madEggBrowser_searchEngine',
  SEARCH_ICON: 'madEggBrowser_searchIcon',
  HOME_PAGE: 'madEggBrowser_homePage'
};

var currentTabId = 0;
var currentTab = 0;
var tabIds = [];

document.addEventListener("DOMContentLoaded", function() {
  setupEventListeners();
  updateBackgroundImage();
  setInterval(universalAdapter, 1000);
  setInterval(updateTimeDate, 1000);
  updateTimeDate();
  loadBookmarks();
  loadSearchEngine();
  if (rotatingText) type();
  newTab();
});

function setupEventListeners() {
  if (uvForm) uvForm.addEventListener("submit", async e => {
    e.preventDefault();
    await handleSearch(uvAddress, true);
  });

  if (navForm) navForm.addEventListener("submit", async e => {
    e.preventDefault();
    await handleSearch(navAddress, false);
  });

  if (uvAddress) uvAddress.addEventListener("keydown", async e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSearch(uvAddress, true);
    }
  });

  const addBookmarkButton = document.getElementById('add-bookmark');
  const saveBookmarkButton = document.getElementById('save-bookmark');
  
  if (addBookmarkButton) addBookmarkButton.addEventListener('click', () => {
    const modal = document.getElementById('add-bookmark-modal');
    if (modal) modal.style.display = 'flex';
  });

  if (saveBookmarkButton) saveBookmarkButton.addEventListener('click', saveBookmark);
  
  const dropdownBtn = document.querySelector('.search-engine-dropdownaa');
  if (dropdownBtn) dropdownBtn.addEventListener('click', () => toggleDropdown(0));
  
  const addEngineBtn = document.getElementById('add-custom-engine-btn');
  if (addEngineBtn) addEngineBtn.addEventListener('click', addCustomEngine);
  
  const cancelEngineBtn = document.getElementById('cancel-custom-engine');
  if (cancelEngineBtn) cancelEngineBtn.addEventListener('click', () => {
    const modal = document.getElementById('custom-engine-modal');
    if (modal) modal.style.display = 'none';
  });

  const cancelBookmarkBtn = document.getElementById('cancel-bookmark');
  if (cancelBookmarkBtn) cancelBookmarkBtn.addEventListener('click', () => {
    const modal = document.getElementById('add-bookmark-modal');
    if (modal) modal.style.display = 'none';
    const nameInput = document.getElementById('bookmark-name');
    const urlInput = document.getElementById('bookmark-url');
    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
  });

  if (navAddress) {
    navAddress.addEventListener('focus', () => navAddress.select());
    navAddress.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch(navAddress, false);
      }
    });
  }
}

function toggleDropdown(index) {
  const dropdown = document.getElementById(`engineDropdown-${index}`);
  if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function selectEngine(icon, engine, index) {
  const dropdownBtn = document.querySelector(`.search-engine-dropdownaa`);
  const statusMsg = document.getElementById(`statusMessage-${index}`);
  const engineName = document.querySelector(`#engineDropdown-${index} a[data-engine="${engine}"]`)?.textContent.trim() || "Custom";
  
  searchEngineInputs.forEach(input => {
    if (input) input.value = engine.includes("%s") ? engine : engine + "%s";
  });
  
  if (dropdownBtn) dropdownBtn.querySelector("img").src = icon;
  if (statusMsg) statusMsg.textContent = `Searching with ${engineName}`;
  
  const dropdown = document.getElementById(`engineDropdown-${index}`);
  if (dropdown) dropdown.style.display = "none";
  
  saveSearchEngine(icon, engine.includes("%s") ? engine : engine + "%s");

  const tempUrl = engine.includes("%s") ? engine.replace("%s", "") : engine;
  try {
    const homePageUrl = new URL(tempUrl).origin + "/";
    localStorage.setItem(STORAGE_KEYS.HOME_PAGE, homePageUrl);
    const startPage = document.getElementById("uv-start-page");
    if (startPage) startPage.value = homePageUrl;
  } catch (e) {
    console.error("Invalid URL:", e);
  }
}

function formatSearch(input) {
  try {
    const url = new URL(input);
    return url.href;
  } catch (e) {
    try {
      const searchEngine = document.querySelector("#uv-search-engine")?.value;
      if (searchEngine) {
        if (searchEngine.includes("%s")) {
          return searchEngine.replace("%s", encodeURIComponent(input));
        }
        return searchEngine + encodeURIComponent(input);
      }
    } catch (e) {
      return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
  }
}

async function handleSearch(inputElement, isMainSearch) {
  if (!inputElement) return;
  const query = inputElement.value.trim();
  if (!query) return;
  
  inputElement.value = "";
  if (isMainSearch) inputElement.blur();

  try {
    await registerSW();
    const url = formatSearch(query);
    
    if (document.getElementById('frames')) {
      const iframe = getActiveIframe();
      const prefix = __uv$config.prefix;
      const encUrl = prefix + __uv$config.encodeUrl(url);
      const finalUrl = "/proxy/" + encUrl;
      
      showProxy();
      
      if (iframe) {
        iframe.src = finalUrl;
      } else {
        newTab(finalUrl);
      }

      if (!isMainSearch) updateAddressBar();
    } else {
      window.location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
    }
  } catch (err) {
    console.error("Search error:", err);
    if (error) error.textContent = "Failed to process search.";
    if (errorCode) errorCode.textContent = err.toString();
  }
}

function updateAddressBar() {
  const f = getActiveIframe();
  if (!f || !navAddress) return;
  if (document.activeElement === navAddress) return;
  
  let raw;
  try { raw = f.contentWindow.location.href; } 
  catch { raw = f.src; }
  
  const enc = raw.replace(/^.*?__uv$config.prefix/, "");
  const dec = __uv$config.decodeUrl ? __uv$config.decodeUrl(enc) : atob(enc);
  navAddress.value = dec.slice(dec.indexOf("https://"));
}

function getActiveIframe() {
  return document.getElementById("frame" + currentTab);
}

function getTabId() {
  tabIds.push(currentTabId);
  return currentTabId++;
}

function newTab(url) {
  if (!url) {
    const homePage = localStorage.getItem(STORAGE_KEYS.HOME_PAGE) || "https://google.com/";
    url = __uv$config.prefix + __uv$config.encodeUrl(homePage);
  }

  const el = document.getElementById("tabBarTabs");
  if (!el) return null;

  const tabId = getTabId();
  el.innerHTML += `
    <div class="tabBarTab" id="tab${tabId}" onclick="openTab(${tabId})">
      <div class="tab-content">
        <img id="favicon-${tabId}" class="tab-favicon">
        <span id="title-${tabId}" class="tab-title">New Tab</span>
        <i class="fa-solid fa-xmark tab-close" onclick="event.stopPropagation();closeTab(${tabId})"></i>
      </div>
    </div>`;
  
  const tab = el.lastElementChild;
  if (tab) setTimeout(() => tab.style.marginTop = "9px", 1);
  
  const frame = document.createElement("iframe");
  frame.src = url;
  frame.classList.add("tab");
  frame.id = "frame" + tabId;
  frame.style.cssText = "width:100%;height:100%;border:none;display:none;";
  
  const framesContainer = document.getElementById("frames");
  if (framesContainer) framesContainer.append(frame);
  
  openTab(tabId);
  return frame;
}

function openTab(tabId) {
  document.querySelectorAll(".tabBarTab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(f => f.style.display = "none");
  
  currentTab = tabId;
  const tabEl = document.getElementById("tab" + tabId);
  const frameEl = document.getElementById("frame" + tabId);
  
  if (tabEl && frameEl) {
    tabEl.classList.add("active");
    frameEl.style.display = "block";
    updateAddressBar();
  }
}

function closeTab(tabId) {
  const tabEl = document.getElementById("tab" + tabId);
  const frameEl = document.getElementById("frame" + tabId);
  
  if (tabEl) tabEl.remove();
  if (frameEl) frameEl.remove();
  
  const idx = tabIds.indexOf(tabId);
  if (idx > -1) tabIds.splice(idx, 1);
  
  if (currentTab === tabId) {
    if (tabIds.length) openTab(tabIds[tabIds.length - 1]);
    else newTab();
  }
}

function closeAllTabs() {
  const frames = document.getElementById("frames");
  const tabs = document.getElementById("tabBarTabs");
  if (frames) frames.innerHTML = "";
  if (tabs) tabs.innerHTML = "";
  tabIds = [];
  currentTab = 0;
  newTab();
}

function showProxy() { 
  const proxyDiv = document.getElementById("proxy-div");
  if (proxyDiv) proxyDiv.className = "show-proxy-div"; 
}

function hideProxy() { 
  const proxyDiv = document.getElementById("proxy-div");
  if (proxyDiv) proxyDiv.className = "hide-proxy-div"; 
}

function goHome() { 
  closeAllTabs(); 
  hideProxy(); 
}

function goBack() { 
  const f = getActiveIframe(); 
  if (f && f.contentWindow) f.contentWindow.history.back(); 
}

function goForward() { 
  const f = getActiveIframe(); 
  if (f && f.contentWindow) f.contentWindow.history.forward(); 
}

function reloadPage() { 
  const f = getActiveIframe(); 
  if (f && f.contentWindow) f.contentWindow.location.reload(); 
}

function proxyFullscreen() {
  const f = getActiveIframe();
  if (f) {
    if (f.requestFullscreen) f.requestFullscreen();
    else if (f.webkitRequestFullscreen) f.webkitRequestFullscreen();
    else if (f.msRequestFullscreen) f.msRequestFullscreen();
  }
}

function windowPopout() {
  const popup = open("about:blank", "_blank");
  if (!popup || popup.closed) {
    alert("Window blocked. Please allow popups for this site.");
    return false;
  }
  
  const f = getActiveIframe();
  if (!f) return false;
  
  const iframe = popup.document.createElement("iframe");
  iframe.src = f.src;
  iframe.style.position = "fixed";
  iframe.style.top = iframe.style.bottom = iframe.style.left = iframe.style.right = "0";
  iframe.style.border = iframe.style.outline = "none";
  iframe.style.width = iframe.style.height = "100%";
  popup.document.body.innerHTML = "";
  popup.document.body.appendChild(iframe);
  return true;
}

function navigateBookmark(url) {
  if (!url) {
    const clickedBookmark = event?.currentTarget;
    if (clickedBookmark) url = clickedBookmark.dataset.url;
  }
  
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  
  if (uvAddress) {
    uvAddress.value = url;
    uvAddress.focus();
    handleSearch(uvAddress, true);
  }
}

function saveBookmark() {
    const nameInput = document.getElementById('bookmark-name');
    const urlInput = document.getElementById('bookmark-url');
    if (!nameInput || !urlInput) return;
    
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    
    if (!name || !url) {
        alert('Please fill in both fields');
        return;
    }
  
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    
    try {
        new URL(url);
        const cleanUrl = sanitizeUrl(url);
        const faviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=256`;
        
        if (currentEditingBookmark) {
            const span = currentEditingBookmark.querySelector('span');
            const img = currentEditingBookmark.querySelector('img');
            if (span) span.textContent = name;
            currentEditingBookmark.dataset.url = url;
            if (img) img.src = faviconUrl;
        } else {
            addBookmarkToDOM(name, url, faviconUrl);
        }
        
        saveBookmarksToStorage();
        closeBookmarkModal();
    } catch (e) {
        alert('Please enter a valid URL');
    }
}

function loadSearchEngine() {
  const savedEngine = localStorage.getItem(STORAGE_KEYS.SEARCH_ENGINE);
  const savedIcon = localStorage.getItem(STORAGE_KEYS.SEARCH_ICON);
  
  if (savedEngine && savedIcon) {
    searchEngineInputs.forEach(input => {
      if (input) input.value = savedEngine.includes("%s") ? savedEngine : savedEngine + "%s";
    });
    
    const dropdownImg = document.querySelector('.search-engine-dropdownaa img');
    if (dropdownImg) dropdownImg.src = savedIcon;
    
    const statusMsg = document.getElementById('statusMessage-0');
    if (statusMsg) statusMsg.textContent = `Searching with ${getEngineName(savedEngine)}`;
    
    const tempUrl = savedEngine.includes("%s") ? savedEngine.replace("%s", "") : savedEngine;
    try {
      const homePageUrl = new URL(tempUrl).origin + "/";
      localStorage.setItem(STORAGE_KEYS.HOME_PAGE, homePageUrl);
      const startPage = document.getElementById("uv-start-page");
      if (startPage) startPage.value = homePageUrl;
    } catch (e) {
      console.error("Invalid URL:", e);
    }
  }
}

function getEngineName(engineUrl) {
  const engineMap = {
    'https://www.google.com/search?q=': 'Google',
    'https://search.brave.com/search?q=': 'Brave',
    'https://www.bing.com/search?q=': 'Bing'
  };
  return engineMap[engineUrl] || 'Custom';
}

function saveSearchEngine(icon, engine) {
  localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, engine);
  localStorage.setItem(STORAGE_KEYS.SEARCH_ICON, icon);
}

function universalAdapter() {
  const savedHome = localStorage.getItem(STORAGE_KEYS.HOME_PAGE) || '';
  const dropdownBtn = document.querySelector(`.search-engine-dropdownaa`);
  const statusMsg = document.getElementById(`statusMessage-0`);

  for (let id of tabIds) {
    const frame = document.getElementById("frame" + id);
    if (!frame) continue;
    
    let raw;
    try { raw = frame.contentWindow.location.href; } 
    catch { raw = frame.src; }
    
    const enc = raw.replace(/^.*?__uv$config.prefix/, "");
    const dec = __uv$config.decodeUrl ? __uv$config.decodeUrl(enc) : atob(enc);
    const url = dec.slice(dec.indexOf("https://"));
    
    const titleElement = document.getElementById(`title-${id}`);
    if (titleElement) {
      titleElement.textContent = (frame.contentDocument?.title) || url.split("/").pop() || "untitled";
    }
    
    const faviconElement = document.getElementById(`favicon-${id}`);
    if (faviconElement) {
      faviconElement.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=256`;
    }
    
    if (id === currentTab && navAddress) {
      navAddress.value = url;
      if (url === savedHome && dropdownBtn && statusMsg) {
        const savedIcon = localStorage.getItem(STORAGE_KEYS.SEARCH_ICON);
        const img = dropdownBtn.querySelector("img");
        if (img) img.src = savedIcon;
        statusMsg.textContent = `Home Page`;
      }
    }
  }
}

function updateTimeDate() {
  const date = new Date();
  const options = {
    weekday: 'long', 
    year: 'numeric', 
    month: 'long',
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  };
  const timeDate = document.getElementById('time-date');
  if (timeDate) timeDate.textContent = date.toLocaleDateString('en-US', options).replace(' at', ',');
}

function SHS() {
  const sites = [
    "https://docs.google.com",
    "https://drive.google.com",
    "https://classroom.google.com",
    "https://classroom.google.com/u/1/a/not-turned-in/all",
    "https://slides.google.com",
    "https://google.com",
    "https://youtube.com",
    "https://www.edpuzzle.com",
    "https://www.gmail.com",
    "https://sheets.google.com",
    "https://www.google.com/search?q=calculator"
  ];
  
  sites.forEach(site => window.open(site));
}

function AB() {
  let inFrame;
  try {
    inFrame = window !== top;
  } catch (e) {
    inFrame = true;
  }
  
  if (!inFrame && !navigator.userAgent.includes("Firefox")) {
    const popup = open("about:blank", "_blank");
    if (!popup || popup.closed) {
      alert("Window blocked. Please allow popups for this site.");
    } else {
      const doc = popup.document;
      const iframe = doc.createElement("iframe");
      const style = iframe.style;
      const link = doc.createElement("link");
      const name = localStorage.getItem("name") || "Home";
      const icon = localStorage.getItem("icon") || "https://raw.githubusercontent.com/UseInterstellar/Interstellar/refs/heads/main/static/favicon.ico";
      
      doc.title = name;
      link.rel = "icon";
      link.href = icon;
      iframe.src = location.href;
      style.position = "fixed";
      style.top = style.bottom = style.left = style.right = "0";
      style.border = style.outline = "none";
      style.width = style.height = "100%";
      
      const script = doc.createElement("script");
      script.textContent = `window.onbeforeunload = function(event) {
        const confirmationMessage = 'Leave Site?';
        (event || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      };`;
      
      doc.head.appendChild(link);
      doc.body.appendChild(iframe);
      doc.head.appendChild(script);
    }
  }
}

const messages = [
  "Your phone's at 1%. Find a charger ASAP.",
  "Still waiting for a reply? Classic.",
  "Check your phone again. Yep, still no new texts.",
  "You texted them, they didn't reply. Story of our lives.",
  "Refresh again. It's not gonna change, but okay.",
  "How is it that we only notice how tired we are once we sit down?"
];

let currentMessageIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;
const typingSpeed = 100;
const pauseBetween = 2000;

function type() {
  if (!rotatingText) return;
  
  const currentMessage = messages[currentMessageIndex];
  
  if (isDeleting) {
    rotatingText.textContent = currentMessage.substring(0, currentCharIndex--);
    if (currentCharIndex < 0) {
      isDeleting = false;
      currentMessageIndex = (currentMessageIndex + 1) % messages.length;
      setTimeout(type, 500);
    } else {
      setTimeout(type, typingSpeed / 2);
    }
  } else {
    rotatingText.textContent = currentMessage.substring(0, currentCharIndex++);
    if (currentCharIndex > currentMessage.length) {
      isDeleting = true;
      setTimeout(type, pauseBetween);
    } else {
      setTimeout(type, typingSpeed);
    }
  }
}

function addCustomEngine() {
    const customName = document.getElementById('custom-engine-name');
    const customUrl = document.getElementById('custom-engine-url');
    const customIcon = document.getElementById('custom-engine-icon');
    if (!customName || !customUrl) return;
    
    const name = customName.value.trim();
    let url = customUrl.value.trim();
    const icon = customIcon?.value.trim() || `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url.split('?')[0].split('/')[2])}&size=256`;
    const editMode = document.getElementById('custom-engine-modal-title')?.textContent === 'Edit Search Engine';
    const originalUrl = document.getElementById('custom-engine-modal')?.dataset.originalUrl;
  
    if (!name || !url) {
      alert('Please provide both a name and URL for the custom search engine');
      return;
    }
  
    if (!url.includes("%s")) {
      if (!confirm('Your URL doesn\'t contain a "%s" placeholder. The search term will be appended to the end. Is this okay?')) {
        return;
      }
    }
  
    const dropdownContent = document.querySelector('.dropdown-contentaa');
    if (!dropdownContent) return;
    
    if (editMode && originalUrl) {
      const existingEngine = document.querySelector(`.dropdown-contentaa a[data-engine="${originalUrl}"]`);
      if (existingEngine) {
        existingEngine.setAttribute('data-engine', url.includes("%s") ? url : url + "%s");
        existingEngine.innerHTML = `<img src="${icon}" alt="${name}">${name}<i class="fa-solid fa-pen edit-engine" onclick="event.stopPropagation();editEngine(this.parentNode)"></i><i class="fa-solid fa-trash delete-engine" onclick="event.stopPropagation();deleteEngine(this.parentNode)"></i>`;
      }
    } else {
      const newEngine = document.createElement('a');
      newEngine.href = "javascript:void(0);";
      newEngine.setAttribute('data-engine', url.includes("%s") ? url : url + "%s");
      newEngine.onclick = function() {
        selectEngine(icon, url.includes("%s") ? url : url + "%s", 0);
      };
  
      newEngine.innerHTML = `<img src="${icon}" alt="${name}">${name}<i class="fa-solid fa-pen edit-engine" onclick="event.stopPropagation();editEngine(this.parentNode)"></i><i class="fa-solid fa-trash delete-engine" onclick="event.stopPropagation();deleteEngine(this.parentNode)"></i>`;
  
      const addCustomBtn = document.querySelector('.add-custom-engine');
      if (addCustomBtn) dropdownContent.insertBefore(newEngine, addCustomBtn);
    }
    
    const modal = document.getElementById('custom-engine-modal');
    if (modal) modal.style.display = 'none';
    customName.value = '';
    customUrl.value = '';
    if (customIcon) customIcon.value = '';
}

function deleteEngine(engineElement) {
  if (confirm('Are you sure you want to delete this search engine?')) {
    engineElement.remove();
  }
}

function showCustomEngineModal() {
  const modal = document.getElementById('custom-engine-modal');
  if (modal) modal.style.display = 'flex';
}

function saveBookmarksToStorage() {
    const bookmarks = [];
    document.querySelectorAll('.bookmark:not(#add-bookmark)').forEach(bookmark => {
      const span = bookmark.querySelector('span');
      const img = bookmark.querySelector('img');
      if (span && img) {
        bookmarks.push({
          name: span.textContent,
          url: bookmark.dataset.url,
          icon: img.src
        });
      }
    });
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
}

function loadBookmarks() {
  const bookmarksContainer = document.getElementById('bookmarks');
  if (!bookmarksContainer) return;
  
  document.querySelectorAll('.bookmark:not(#add-bookmark)').forEach(bm => bm.remove());
  
  const savedBookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
  if (savedBookmarks) {
    try {
      JSON.parse(savedBookmarks).forEach(bookmark => {
        addBookmarkToDOM(bookmark.name, bookmark.url, bookmark.icon);
      });
    } catch (e) {
      console.error("Error loading bookmarks:", e);
      loadDefaultBookmarks();
    }
  } else {
    loadDefaultBookmarks();
  }
}

function loadDefaultBookmarks() {
  const defaultBookmarks = [
    { name: "YouTube", url: "https://www.youtube.com", icon: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://youtube.com&size=256" },
    { name: "Twitter", url: "https://twitter.com", icon: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://twitter.com&size=256" },
    { name: "Discord", url: "https://discord.com", icon: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://discord.com&size=256" },
    { name: "GeForce Now", url: "https://www.nvidia.com/en-us/geforce-now/", icon: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://nvidia.com&size=256" }
  ];
  
  defaultBookmarks.forEach(bookmark => {
    addBookmarkToDOM(bookmark.name, bookmark.url, bookmark.icon);
  });
}

function addBookmarkToDOM(name, url, iconUrl) {
    const bookmarksContainer = document.getElementById('bookmarks');
    const addBookmarkBtn = document.getElementById('add-bookmark');
    if (!bookmarksContainer || !addBookmarkBtn) return;
    
    const bookmark = document.createElement('a');
    bookmark.href = '#';
    bookmark.className = 'bookmark';
    bookmark.dataset.url = url;
    
    let faviconUrl = iconUrl;
    if (!iconUrl) {
        const cleanUrl = sanitizeUrl(url);
        faviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=256`;
    }
    
    bookmark.innerHTML = `<img src="${faviconUrl}" alt="${name}"><span>${name}</span><button class="edit-bookmark"><i class="fa-solid fa-pen"></i></button><button class="delete-bookmark"><i class="fa-solid fa-trash"></i></button>`;
    
    bookmarksContainer.insertBefore(bookmark, addBookmarkBtn);
    
    const editBtn = bookmark.querySelector('.edit-bookmark');
    const deleteBtn = bookmark.querySelector('.delete-bookmark');
    
    if (editBtn) editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      editBookmark(bookmark);
    });
    
    if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('Delete this bookmark?')) {
        bookmark.remove();
        saveBookmarksToStorage();
      }
    });
    
    bookmark.addEventListener('click', (e) => {
      if (!e.target.closest('.edit-bookmark') && !e.target.closest('.delete-bookmark')) {
        e.preventDefault();
        navigateBookmark(url);
      }
    });
}

function setHomePage(url) {
  if (!url) {
    const iframe = getActiveIframe();
    if (iframe) {
      try {
        url = iframe.contentWindow.location.href;
      } catch (e) {
        url = iframe.src;
      }
    }
  }
  
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  try {
    new URL(url);
    localStorage.setItem(STORAGE_KEYS.HOME_PAGE, url);
    return true;
  } catch (e) {
    console.error('Invalid URL:', e);
    alert('Invalid URL format. Please enter a valid web address.');
    return false;
  }
}

function editBookmark(bookmarkElement) {
    currentEditingBookmark = bookmarkElement;
    const nameInput = document.getElementById('bookmark-name');
    const urlInput = document.getElementById('bookmark-url');
    const modal = document.getElementById('add-bookmark-modal');
    
    if (nameInput && urlInput && modal) {
      const span = bookmarkElement.querySelector('span');
      if (span) nameInput.value = span.textContent;
      urlInput.value = bookmarkElement.dataset.url;
      modal.style.display = 'flex';
      nameInput.focus();
    }
}

function editEngine(engineElement) {
  const name = engineElement.textContent.trim();
  const url = engineElement.dataset.engine;
  const icon = engineElement.querySelector('img')?.src;
  
  const modalTitle = document.getElementById('custom-engine-modal-title');
  const nameInput = document.getElementById('custom-engine-name');
  const urlInput = document.getElementById('custom-engine-url');
  const iconInput = document.getElementById('custom-engine-icon');
  const modal = document.getElementById('custom-engine-modal');
  
  if (modalTitle && nameInput && urlInput && iconInput && modal) {
    modalTitle.textContent = 'Edit Search Engine';
    nameInput.value = name;
    urlInput.value = url;
    iconInput.value = icon || '';
    modal.dataset.originalUrl = url;
    modal.style.display = 'flex';
  }
}

let currentEditingBookmark = null;

function closeBookmarkModal() {
    const modal = document.getElementById('add-bookmark-modal');
    const nameInput = document.getElementById('bookmark-name');
    const urlInput = document.getElementById('bookmark-url');
    
    if (modal) modal.style.display = 'none';
    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
    currentEditingBookmark = null;
}

function sanitizeUrl(url) {
    let cleanUrl = url.replace(/^(https?:)?\/\//, '');
    cleanUrl = cleanUrl.split('/')[0];
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    return cleanUrl;
}

function updateBackgroundImage() {
  const savedBg = localStorage.getItem('backgroundImage');
  if (savedBg) {
    document.documentElement.style.setProperty('--background-image', `url(${savedBg})`);
  }
}

if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}

const proxyDiv = document.getElementById('proxy-div');
const navbar = document.querySelector('.navbar');

if (proxyDiv && navbar) {
  const observer = new MutationObserver(() => {
    navbar.style.display = proxyDiv.classList.contains('show-proxy-div') ? 'none' : 'flex';
  });
  observer.observe(proxyDiv, {attributes: true, attributeFilter: ['class']});
}
