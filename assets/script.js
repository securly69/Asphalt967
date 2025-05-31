"use strict";
const STORAGE_KEYS = {
  BOOKMARKS: "madEggBrowser_bookmarks",
  SEARCH_ENGINE: "madEggBrowser_searchEngine",
  SEARCH_ICON: "madEggBrowser_searchIcon",
  HOME_PAGE: "madEggBrowser_homePage"
};
var currentTabId = 0;
var currentTab = 0;
var tabIds = [];
document.addEventListener("DOMContentLoaded", function() {
  let connection = null;
  if (typeof BareMux !== "undefined") {
    connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  }
  const uvForm = document.getElementById("uv-form");
  const uvAddress = document.getElementById("uv-address");
  const navForm = document.getElementById("nav-bar-form");
  const navAddress = document.getElementById("nav-bar-address");
  const searchEngineInputs = document.querySelectorAll("#uv-search-engine");
  const error = document.getElementById("uv-error");
  const errorCode = document.getElementById("uv-error-code");
  const addBookmarkButton = document.getElementById("add-bookmark");
  const saveBookmarkButton = document.getElementById("save-bookmark");
  const showCustomEngineButton = document.getElementById("show-custom-engine");
  const addCustomEngineButton = document.getElementById("add-custom-engine-btn");
  const cancelCustomEngineButton = document.getElementById("cancel-custom-engine");
  const cancelBookmarkButton = document.getElementById("cancel-bookmark");
  const saveBookmarkBtn = document.getElementById("save-bookmark");
  const cancelBookmarkBtn = document.getElementById("cancel-bookmark");
  const addBookmarkBtn = document.getElementById("add-bookmark");
  uvForm?.addEventListener("submit", async function(e) {
    e.preventDefault();
    await handleSearch(uvAddress, true);
  });
  navForm?.addEventListener("submit", async function(e) {
    e.preventDefault();
    await handleSearch(navAddress, false);
  });
  uvAddress?.addEventListener("keydown", async function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleSearch(uvAddress, true);
    }
  });
  navAddress?.addEventListener("focus", function() {
    navAddress.select();
  });
  navAddress?.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(navAddress, false);
    }
  });
  addBookmarkButton?.addEventListener("click", function() {
    document.getElementById("add-bookmark-modal").style.display = "flex";
  });
  saveBookmarkButton?.addEventListener("click", saveBookmark);
  showCustomEngineButton?.addEventListener("click", showCustomEngineModal);
  addCustomEngineButton?.addEventListener("click", addCustomEngine);
  cancelCustomEngineButton?.addEventListener("click", function() {
    document.getElementById("custom-engine-modal").style.display = "none";
  });
  cancelBookmarkButton?.addEventListener("click", function() {
    document.getElementById("add-bookmark-modal").style.display = "none";
    document.getElementById("bookmark-name").value = "";
    document.getElementById("bookmark-url").value = "";
  });
  saveBookmarkBtn?.addEventListener("click", saveBookmark);
  cancelBookmarkBtn?.addEventListener("click", closeBookmarkModal);
  addBookmarkBtn?.addEventListener("click", function() {
    currentEditingBookmark = null;
    document.getElementById("add-bookmark-modal").style.display = "flex";
    document.getElementById("bookmark-name").focus();
  });
  updateBackgroundImage();
  setInterval(universalAdapter, 1000);
  setInterval(updateTimeDate, 1000);
  updateTimeDate();
  loadBookmarks();
  loadSearchEngine();
  type();
  function handleSearch(inputElement, isMainSearch) {
    return (async function() {
      const query = inputElement.value.trim();
      if (!query) return;
      inputElement.value = "";
      if (isMainSearch) {
        inputElement.blur();
      }
      try {
        await registerSW();
        const url = search(query, document.querySelector("#uv-search-engine").value);
        const prefix = __uv$config.prefix;
        const encUrl = prefix + __uv$config.encodeUrl(url);
        let finalUrl = encUrl;
        if (connection) {
          const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
          if (await connection.getTransport() !== "/epoxy/index.mjs") {
            await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
          }
          finalUrl = "http://localhost:8080" + encUrl;
        }
        showProxy();
        const iframe = getActiveIframe();
        if (iframe) {
          iframe.src = finalUrl;
        } else {
          newTab(finalUrl);
        }
        if (!isMainSearch) {
          updateAddressBar();
        }
      } catch (err) {
        console.error("Search error:", err);
        if (error) error.textContent = "Failed to process search.";
        if (errorCode) errorCode.textContent = err.toString();
      }
    })();
  }
  function updateAddressBar() {
    const f = getActiveIframe();
    if (!f) return;
    if (document.activeElement === navAddress) return;
    let raw;
    try {
      raw = f.contentWindow.location.href;
    } catch {
      raw = f.src;
    }
    const enc = raw.replace(/^.*?__uv\$config\.prefix/, "");
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
    setTimeout(function() {
      tab.style.marginTop = "9px";
    }, 1);
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.classList.add("tab");
    frame.id = "frame" + tabId;
    frame.style.cssText = "width:100%;height:100%;border:none;display:none;";
    document.getElementById("frames").append(frame);
    openTab(tabId);
    return frame;
  }
  function openTab(tabId) {
    document.querySelectorAll(".tabBarTab").forEach(function(t) {
      t.classList.remove("active");
    });
    document.querySelectorAll(".tab").forEach(function(f) {
      f.style.display = "none";
    });
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
      if (tabIds.length) {
        openTab(tabIds[tabIds.length - 1]);
      } else {
        newTab();
      }
    }
  }
  function closeAllTabs() {
    document.getElementById("frames").innerHTML = "";
    document.getElementById("tabBarTabs").innerHTML = "";
    tabIds = [];
    currentTab = 0;
    newTab();
  }
  function showProxy() {
    document.getElementById("proxy-div").className = "show-proxy-div";
  }
  function hideProxy() {
    document.getElementById("proxy-div").className = "hide-proxy-div";
  }
  function goHome() {
    closeAllTabs();
    hideProxy();
  }
  function goBack() {
    const f = getActiveIframe();
    f && f.contentWindow.history.back();
  }
  function goForward() {
    const f = getActiveIframe();
    f && f.contentWindow.history.forward();
  }
  function reloadPage() {
    const f = getActiveIframe();
    f && f.contentWindow.location.reload();
  }
  function proxyFullscreen() {
    const f = getActiveIframe();
    f && (f.requestFullscreen?.() || f.webkitRequestFullscreen?.() || f.msRequestFullscreen?.());
  }
  function windowPopout() {
    const popup = open("about:blank", "_blank");
    if (!popup || popup.closed) {
      alert("Window blocked. Please allow popups for this site.");
      return false;
    }
    const f = getActiveIframe();
    if (!f) return;
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
      const clickedBookmark = event.currentTarget;
      url = clickedBookmark.dataset.url;
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    uvAddress.value = url;
    uvAddress.focus();
    handleSearch(uvAddress, true);
  }
  function saveBookmark() {
    const name = document.getElementById("bookmark-name").value.trim();
    let url = document.getElementById("bookmark-url").value.trim();
    if (!name || !url) {
      alert("Please fill in both fields");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    try {
      new URL(url);
      const cleanUrl = sanitizeUrl(url);
      const faviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=256`;
      if (currentEditingBookmark) {
        currentEditingBookmark.querySelector("span").textContent = name;
        currentEditingBookmark.dataset.url = url;
        currentEditingBookmark.querySelector("img").src = faviconUrl;
      } else {
        addBookmarkToDOM(name, url, faviconUrl);
      }
      saveBookmarksToStorage();
      closeBookmarkModal();
    } catch (e) {
      alert("Please enter a valid URL");
    }
  }
  function loadSearchEngine() {
    const savedEngine = localStorage.getItem(STORAGE_KEYS.SEARCH_ENGINE);
    const savedIcon = localStorage.getItem(STORAGE_KEYS.SEARCH_ICON);
    if (savedEngine && savedIcon) {
      searchEngineInputs.forEach(function(input) {
        input.value = savedEngine.includes("%s") ? savedEngine : savedEngine + "%s";
      });
      const dropdownImg = document.querySelector(".search-engine-dropdownaa img");
      if (dropdownImg) dropdownImg.src = savedIcon;
      const statusMsg = document.getElementById("statusMessage-0");
      if (statusMsg) statusMsg.textContent = `Searching with ${getEngineName(savedEngine)}`;
      const tempUrl = savedEngine.includes("%s") ? savedEngine.replace("%s", "") : savedEngine;
      const homePageUrl = new URL(tempUrl).origin + "/";
      localStorage.setItem(STORAGE_KEYS.HOME_PAGE, homePageUrl);
      const uvStart = document.getElementById("uv-start-page");
      if (uvStart) uvStart.value = homePageUrl;
    }
  }
  function getEngineName(engineUrl) {
    const engineMap = {
      "https://www.google.com/search?q=": "Google",
      "https://search.brave.com/search?q=": "Brave",
      "https://www.bing.com/search?q=": "Bing"
    };
    return engineMap[engineUrl] || "Custom";
  }
  function saveSearchEngine(icon, engine) {
    localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, engine);
    localStorage.setItem(STORAGE_KEYS.SEARCH_ICON, icon);
  }
  function universalAdapter() {
    const savedHome = localStorage.getItem(STORAGE_KEYS.HOME_PAGE) || "";
    const dropdownBtn = document.querySelector(".search-engine-dropdownaa");
    const statusMsg = document.getElementById("statusMessage-0");
    for (let id of tabIds) {
      const frame = document.getElementById("frame" + id);
      if (!frame) continue;
      let raw;
      try {
        raw = frame.contentWindow.location.href;
      } catch {
        raw = frame.src;
      }
      const enc = raw.replace(/^.*?__uv\$config\.prefix/, "");
      const dec = __uv$config.decodeUrl ? __uv$config.decodeUrl(enc) : atob(enc);
      const url = dec.slice(dec.indexOf("https://"));
      const titleElement = document.getElementById(`title-${id}`);
      if (titleElement) {
        titleElement.textContent = (frame.contentDocument && frame.contentDocument.title) || url.split("/").pop() || "untitled";
      }
      const faviconElement = document.getElementById(`favicon-${id}`);
      if (faviconElement) {
        faviconElement.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=256`;
      }
      if (id === currentTab) {
        if (navAddress) navAddress.value = url;
        if (url === savedHome && dropdownBtn && statusMsg) {
          const savedIcon = localStorage.getItem(STORAGE_KEYS.SEARCH_ICON);
          dropdownBtn.querySelector("img").src = savedIcon;
          statusMsg.textContent = `Home Page`;
        }
      }
    }
  }
  function updateTimeDate() {
    const date = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };
    const timeDateEl = document.getElementById("time-date");
    if (timeDateEl) timeDateEl.textContent = date.toLocaleDateString("en-US", options).replace(" at", ",");
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
    sites.forEach(function(site) {
      window.open(site);
    });
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
        style.top = style.bottom = style.left = style.right = 0;
        style.border = style.outline = "none";
        style.width = style.height = "100%";
        const script = doc.createElement("script");
        script.textContent = `
        window.onbeforeunload = function (event) {
          const confirmationMessage = 'Leave Site?';
          (event || window.event).returnValue = confirmationMessage;
          return confirmationMessage;
        };
      `;
        doc.head.appendChild(link);
        doc.body.appendChild(iframe);
        doc.head.appendChild(script);
      }
    }
  }
  function type() {
    const rotatingTextEl = document.getElementById("rotating-text");
    if (!rotatingTextEl) return;
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
    (function write() {
      const currentMessage = messages[currentMessageIndex];
      if (isDeleting) {
        rotatingTextEl.textContent = currentMessage.substring(0, currentCharIndex--);
        if (currentCharIndex < 0) {
          isDeleting = false;
          currentMessageIndex = (currentMessageIndex + 1) % messages.length;
          setTimeout(write, 500);
        } else {
          setTimeout(write, typingSpeed / 2);
        }
      } else {
        rotatingTextEl.textContent = currentMessage.substring(0, currentCharIndex++);
        if (currentCharIndex > currentMessage.length) {
          isDeleting = true;
          setTimeout(write, pauseBetween);
        } else {
          setTimeout(write, typingSpeed);
        }
      }
    })();
  }
  function addCustomEngine() {
    const customName = document.getElementById("custom-engine-name").value.trim();
    const customUrl = document.getElementById("custom-engine-url").value.trim();
    const customIcon = document.getElementById("custom-engine-icon").value.trim() || `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(customUrl.split("?")[0].split("/")[2])}&size=256`;
    const editMode = document.getElementById("custom-engine-modal-title").textContent === "Edit Search Engine";
    const originalUrl = document.getElementById("custom-engine-modal").dataset.originalUrl;
    if (!customName || !customUrl) {
      alert("Please provide both a name and URL for the custom search engine");
      return;
    }
    if (!customUrl.includes("%s")) {
      if (!confirm('Your URL doesn\'t contain a "%s" placeholder. The search term will be appended to the end. Is this okay?')) {
        return;
      }
    }
    const dropdownContent = document.querySelector(".dropdown-contentaa");
    if (editMode) {
      const existingEngine = document.querySelector(`.dropdown-contentaa a[data-engine="${originalUrl}"]`);
      if (existingEngine) {
        existingEngine.setAttribute("data-engine", customUrl.includes("%s") ? customUrl : customUrl + "%s");
        existingEngine.innerHTML = `
          <img src="${customIcon}" alt="${customName}">
          ${customName}
          <i class="fa-solid fa-pen edit-engine" onclick="event.stopPropagation();editEngine(this.parentNode)"></i>
          <i class="fa-solid fa-trash delete-engine" onclick="event.stopPropagation();deleteEngine(this.parentNode)"></i>
        `;
      }
    } else {
      const newEngine = document.createElement("a");
      newEngine.href = "javascript:void(0);";
      newEngine.setAttribute("data-engine", customUrl.includes("%s") ? customUrl : customUrl + "%s");
      newEngine.onclick = function() {
        selectEngine(customIcon, customUrl.includes("%s") ? customUrl : customUrl + "%s", 0);
      };
      newEngine.innerHTML = `
        <img src="${customIcon}" alt="${customName}">
        ${customName}
        <i class="fa-solid fa-pen edit-engine" onclick="event.stopPropagation();editEngine(this.parentNode)"></i>
        <i class="fa-solid fa-trash delete-engine" onclick="event.stopPropagation();deleteEngine(this.parentNode)"></i>
      `;
      dropdownContent.insertBefore(newEngine, document.querySelector(".add-custom-engine"));
    }
    document.getElementById("custom-engine-modal").style.display = "none";
    document.getElementById("custom-engine-name").value = "";
    document.getElementById("custom-engine-url").value = "";
    document.getElementById("custom-engine-icon").value = "";
  }
  function deleteEngine(engineElement) {
    if (confirm("Are you sure you want to delete this search engine?")) {
      engineElement.remove();
    }
  }
  function showCustomEngineModal() {
    document.getElementById("custom-engine-modal").style.display = "flex";
  }
  function saveBookmarksToStorage() {
    const bookmarks = [];
    document.querySelectorAll(".bookmark:not(#add-bookmark)").forEach(function(bookmark) {
      bookmarks.push({
        name: bookmark.querySelector("span").textContent,
        url: bookmark.dataset.url,
        icon: bookmark.querySelector("img").src
      });
    });
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  }
  function loadBookmarks() {
    const savedBookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    document.querySelectorAll(".bookmark:not(#add-bookmark)").forEach(function(bm) {
      bm.remove();
    });
    if (savedBookmarks) {
      try {
        JSON.parse(savedBookmarks).forEach(function(bookmark) {
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
    defaultBookmarks.forEach(function(bookmark) {
      addBookmarkToDOM(bookmark.name, bookmark.url, bookmark.icon);
    });
  }
  function addBookmarkToDOM(name, url, iconUrl) {
    const bookmarksContainer = document.getElementById("bookmarks");
    const bookmark = document.createElement("a");
    bookmark.href = "#";
    bookmark.className = "bookmark";
    bookmark.dataset.url = url;
    let faviconUrl = iconUrl;
    if (!iconUrl) {
      const cleanUrl = sanitizeUrl(url);
      faviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=256`;
    }
    bookmark.innerHTML = `
      <img src="${faviconUrl}" alt="${name}">
      <span>${name}</span>
      <button class="edit-bookmark"><i class="fa-solid fa-pen"></i></button>
      <button class="delete-bookmark"><i class="fa-solid fa-trash"></i></button>
    `;
    bookmarksContainer.insertBefore(bookmark, document.getElementById("add-bookmark"));
    const editBtn = bookmark.querySelector(".edit-bookmark");
    const deleteBtn = bookmark.querySelector(".delete-bookmark");
    editBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      editBookmark(bookmark);
    });
    deleteBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm("Delete this bookmark?")) {
        bookmark.remove();
        saveBookmarksToStorage();
      }
    });
    bookmark.addEventListener("click", function(e) {
      if (!e.target.closest(".edit-bookmark") && !e.target.closest(".delete-bookmark")) {
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
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try {
      new URL(url);
      localStorage.setItem(STORAGE_KEYS.HOME_PAGE, url);
      return true;
    } catch (e) {
      console.error("Invalid URL:", e);
      alert("Invalid URL format. Please enter a valid web address.");
      return false;
    }
  }
  function editBookmark(bookmarkElement) {
    currentEditingBookmark = bookmarkElement;
    document.getElementById("bookmark-name").value = bookmarkElement.querySelector("span").textContent;
    document.getElementById("bookmark-url").value = bookmarkElement.dataset.url;
    document.getElementById("add-bookmark-modal").style.display = "flex";
    document.getElementById("bookmark-name").focus();
  }
  function editEngine(engineElement) {
    const name = engineElement.textContent.trim();
    const url = engineElement.dataset.engine;
    const icon = engineElement.querySelector("img").src;
    document.getElementById("custom-engine-modal-title").textContent = "Edit Search Engine";
    document.getElementById("custom-engine-name").value = name;
    document.getElementById("custom-engine-url").value = url;
    document.getElementById("custom-engine-icon").value = icon;
    document.getElementById("custom-engine-modal").dataset.originalUrl = url;
    document.getElementById("custom-engine-modal").style.display = "flex";
  }
  let currentEditingBookmark = null;
  function closeBookmarkModal() {
    document.getElementById("add-bookmark-modal").style.display = "none";
    document.getElementById("bookmark-name").value = "";
    document.getElementById("bookmark-url").value = "";
    currentEditingBookmark = null;
  }
  function sanitizeUrl(url) {
    let cleanUrl = url.replace(/^(https?:)?\/\//, "");
    cleanUrl = cleanUrl.split("/")[0];
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    return cleanUrl;
  }
  function updateBackgroundImage() {
    const savedBg = localStorage.getItem("backgroundImage");
    if (savedBg) {
      document.documentElement.style.setProperty("--background-image", `url(${savedBg})`);
    }
  }
  lucide.createIcons();
  (function() {
    const proxyDiv = document.getElementById("proxy-div");
    const navbar = document.querySelector(".navbar");
    if (!proxyDiv || !navbar) return;
    const observer = new MutationObserver(function() {
      if (proxyDiv.classList.contains("show-proxy-div")) navbar.style.display = "none";
      else navbar.style.display = "flex";
    });
    observer.observe(proxyDiv, { attributes: true, attributeFilter: ["class"] });
  })();
});
