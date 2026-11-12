// Mu'jam Tartib Nuzul untuk Windows: pembungkus Electron di sekitar satu berkas HTML (app/index.html).
// Aplikasi sepenuhnya offline: semua permintaan jaringan diblokir, tidak ada data yang dikirim ke mana pun.
const { app, BrowserWindow, Menu, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");

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
    item.once("done", (ev, state) => {
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
