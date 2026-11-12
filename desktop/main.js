// Mu'jam Tartib Nuzul untuk Windows: pembungkus Electron di sekitar satu berkas HTML (app/index.html).
// Aplikasi sepenuhnya offline: semua permintaan jaringan diblokir, tidak ada data yang dikirim ke mana pun.
const { app, BrowserWindow, Menu, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Uji asap untuk CI (MUJAM_SMOKE=1): menjalankan pencarian, salin, dan ekspor di dalam Electron sungguhan.
const SMOKE = process.env.MUJAM_SMOKE === "1";
const smokeDl = [];
async function ujiAsap(win) {
  const out = process.env.MUJAM_SMOKE_OUT || path.join(os.tmpdir(), "mujam-smoke.json");
  let r;
  try {
    win.show(); win.focus(); win.webContents.focus();
    r = await win.webContents.executeJavaScript(`(async()=>{const r={};r.judul=document.title;r.ofc=typeof OFC!=="undefined";r.plat=APPPLAT;
      $("q").value="حوت";doSearch(true);r.kartu=document.querySelectorAll(".card[data-ai]").length;
      try{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob(["<p>uji</p>"],{type:"text/html"}),"text/plain":new Blob(["uji"],{type:"text/plain"})})]);r.klipApi="ok"}catch(e){r.klipApi=String(e)}
      r.klip=await salinRich("<p>uji</p>","uji");
      r.unduhBin=BIN_OK;eksporWord();
      return r})()`, true);
    for (let i = 0; i < 60 && smokeDl.length < 1; i++) await new Promise(s => setTimeout(s, 250));
    r.unduhan = smokeDl;
    r.ok = !!(r.ofc && r.kartu > 0 && smokeDl.length === 1 && smokeDl[0].state === "completed" && smokeDl[0].pk === "PK" && smokeDl[0].ukuran > 4000);
  } catch (e) { r = { ok: false, galat: String(e) }; }
  fs.writeFileSync(out, JSON.stringify(r, null, 1));
  app.exit(r.ok ? 0 : 1);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(start);
  app.on("window-all-closed", () => app.quit());
}

function bukaLuar(url) {
  // tautan sumber (mis. DOI, tanzil.net) dibuka di peramban bawaan; hanya https
  if (/^https:\/\//i.test(url)) shell.openExternal(url);
}

function start() {
  app.setAppUserModelId("id.miftahuljanah.mujamnuzul.desktop");
  const ses = session.defaultSession;
  ses.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*", "ftp://*/*"] }, (d, cb) => cb({ cancel: true }));
  // satu-satunya izin yang diberikan: menulis ke papan klip (untuk tombol Salin)
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(perm === "clipboard-sanitized-write"));
  ses.setPermissionCheckHandler((wc, perm) => perm === "clipboard-sanitized-write");
  // setelah berkas diunduh (Word/Excel/CSV), tampilkan letaknya di Explorer
  ses.on("will-download", (e, item) => {
    if (SMOKE) item.setSavePath(path.join(os.tmpdir(), "mujam-uji-" + item.getFilename()));
    item.once("done", (ev, state) => {
      if (SMOKE) { smokeDl.push({ nama: item.getFilename(), state, ukuran: state === "completed" ? fs.statSync(item.getSavePath()).size : 0, pk: state === "completed" ? fs.readFileSync(item.getSavePath()).slice(0, 2).toString() : "" }); return; }
      if (state === "completed") shell.showItemInFolder(item.getSavePath());
    });
  });

  const ikon = path.join(__dirname, "build", "icon.png");
  const win = new BrowserWindow({
    width: 1180, height: 860, minWidth: 480, minHeight: 520,
    title: "Mu'jam Tartib Nuzul",
    backgroundColor: "#faf6ec",
    autoHideMenuBar: true,
    ...(fs.existsSync(ikon) ? { icon: ikon } : {}),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => { bukaLuar(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) { e.preventDefault(); bukaLuar(url); }
  });
  win.loadFile(path.join(__dirname, "app", "index.html"));
  if (SMOKE) win.webContents.once("did-finish-load", () => setTimeout(() => ujiAsap(win), 1500));

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Berkas", submenu: [{ role: "quit", label: "Keluar" }] },
    { label: "Sunting", submenu: [
      { role: "undo", label: "Urungkan" }, { role: "redo", label: "Ulangi" }, { type: "separator" },
      { role: "cut", label: "Potong" }, { role: "copy", label: "Salin" }, { role: "paste", label: "Tempel" },
      { role: "selectAll", label: "Pilih semua" } ] },
    { label: "Tampilan", submenu: [
      { role: "zoomIn", label: "Perbesar" }, { role: "zoomOut", label: "Perkecil" }, { role: "resetZoom", label: "Ukuran normal" },
      { type: "separator" }, { role: "togglefullscreen", label: "Layar penuh" } ] },
  ]));
}
