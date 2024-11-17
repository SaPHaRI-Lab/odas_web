const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

var si = require('systeminformation');
var ip = require('ip');

// Module to control application life.
app.commandLine.appendSwitch('--ignore-gpu-blacklist');   // Allows Web GL on Ubuntu

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let odasStudio = {}

function createWindow() {

  // Create the browser window.
  odasStudio.mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webgl: true
    },
    icon: path.join(__dirname, 'resources/images/introlab_icon.png'),
    show: false
  })


  // and load the index.html of the app.
  odasStudio.mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'views/live_data.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  odasStudio.mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    odasStudio.mainWindow = null
    record.quit()
    app.quit()
  })

  odasStudio.mainWindow.on('ready-to-show', function () {
    odasStudio.mainWindow.show()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

async function updateSi() {
  const sysInfo = { cpu: 0, mem: 0, temp: 0 };

  try {
    const currentLoadData = await si.currentLoad();
    sysInfo.cpu = currentLoadData.currentLoad;

    const memData = await si.mem();
    sysInfo.mem = (memData.active / memData.total) * 100;

    const cpuTempData = await si.cpuTemperature();
    sysInfo.temp = cpuTempData.main;

    const cpuVal = sysInfo.cpu ? sysInfo.cpu.toPrecision(3).toString() + ' %' : "N/A";
    const memVal = sysInfo.mem ? sysInfo.mem.toPrecision(2).toString() + ' %' : "N/A";
    const tempVal = sysInfo.temp ? sysInfo.temp.toPrecision(3).toString() + ' °C' : "N/A";

    return {
      cpu: cpuVal,
      mem: memVal,
      temp: tempVal,
      ip: ip.address()
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

ipcMain.handle('get-system-info', async () => {
  return await updateSi();
});

ipcMain.handle('show-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

ipcMain.handle('open-legal-window', () => {
  let legalWindow = new BrowserWindow({ width: 800, height: 600, show: false });

  legalWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'legal.html'),
    protocol: 'file:',
    slashes: true
  }));

  legalWindow.once('ready-to-show', () => {
    legalWindow.show();
  });

  legalWindow.on('closed', () => {
    legalWindow = null;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (odasStudio.mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const sockets = require('./servers.js')
const record = require('./record.js')
require('./share.js')
require('./configure.js')
odasStudio.odas = require('./odas.js')

sockets.startTrackingServer(odasStudio)
sockets.startPotentialServer(odasStudio)