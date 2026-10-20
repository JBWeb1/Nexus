/**
 * Nexus Ledger for Windows: a window onto the Nexus Ledger site set in app-config.json (written by the build).
 * The site does all the work; this keeps it in its own window with a Start-menu icon, and shows an offline page
 * instead of a browser error when there is no internet.
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const { appUrl } = require('./app-config.json');
const APP = new URL(appUrl);
const OFFLINE = path.join(__dirname, 'offline.html');
const sameSite = (url) => { try { return new URL(url).origin === APP.origin; } catch { return false; } };

let win = null;
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 560, show: false, backgroundColor: '#0b1220',
    title: 'Nexus Ledger', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  win.once('ready-to-show', () => win.show());

  // Pages on the Nexus site stay in the app; anything else (Paystack, help links, WhatsApp) opens in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (sameSite(url)) return { action: 'allow' };
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (sameSite(url) || url.startsWith('file:')) return;
    e.preventDefault(); if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
  });
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    // -3 is a cancelled load (e.g. a redirect), not a failure.
    if (isMainFrame && code !== -3 && sameSite(url)) win.loadFile(OFFLINE, { query: { url } });
  });
  win.on('closed', () => { win = null; });
  win.loadURL(APP.href);
}

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: 'File', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'quit' }] },
  { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
  { label: 'View', submenu: [{ role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { label: 'Back', accelerator: 'Alt+Left', click: () => win?.webContents.navigationHistory.goBack() }] },
]));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
