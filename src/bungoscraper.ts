/*
 * bungoscraper.ts
 *
 * bungoscraper - bungo scrape tools -
 **/

'use strict';

/// Constants
// namespace
import { myConst, myNums, myColumns, mySelectors } from './consts/globalvariables';

/// Modules
import * as path from 'node:path'; // path
import { BrowserWindow, app, ipcMain, Tray, Menu, nativeImage } from 'electron'; // electron
import { Scrape } from './class/ElScrape0123'; // scraper
import ELLogger from './class/ElLogger'; // logger
import Dialog from './class/ElDialog0721'; // dialog
import CSV from './class/ElCsv0414'; // csvmaker
// log level
const LOG_LEVEL: string = myConst.LOG_LEVEL ?? 'all';
// loggeer instance
const logger: ELLogger = new ELLogger(myConst.COMPANY_NAME, myConst.APP_NAME, LOG_LEVEL);
// csv instance
const csvMaker = new CSV(myConst.CSV_ENCODING, logger);
// dialog instance
const dialogMaker: Dialog = new Dialog(logger);
// scraper instance
const puppScraper: Scrape = new Scrape(logger);
// desktop path
const dir_home =
  process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'] ?? '';
const dir_desktop = path.join(dir_home, 'Desktop');

/// interfaces
// window option
interface windowOption {
  width: number; // window width
  height: number; // window height
  defaultEncoding: string; // default encode
  webPreferences: Object; // node
}

/*
 main
*/
// main window
let mainWindow: Electron.BrowserWindow;
// quit flg
let isQuiting: boolean;
// global path
let globalRootPath: string;

// set rootpath
if (!myConst.DEVMODE) {
  globalRootPath = path.join(path.resolve(), 'resources');
} else {
  globalRootPath = path.join(__dirname, '..');
}

// create main window
const createWindow = (): void => {
  try {
    // window options
    const windowOptions: windowOption = {
      width: myNums.WINDOW_WIDTH, // window width
      height: myNums.WINDOW_HEIGHT, // window height
      defaultEncoding: myConst.DEFAULT_ENCODING, // encoding
      webPreferences: {
        nodeIntegration: false, // node
        contextIsolation: true, // isolate
        preload: path.join(__dirname, 'preload.js'), // preload
      }
    }
    // Electron window
    mainWindow = new BrowserWindow(windowOptions);
    // hide menubar
    mainWindow.setMenuBarVisibility(false);
    // index.html load
    mainWindow.loadFile(path.join(globalRootPath, 'www', 'index.html'));
    // ready
    mainWindow.once('ready-to-show', () => {
      // dev mode
      if (!app.isPackaged) {
        //mainWindow.webContents.openDevTools();
      }
    });

    // close window
    mainWindow.on('close', (event: any): void => {
      // not closing
      if (!isQuiting && process.platform !== 'darwin') {
        // quit
        app.quit();
        // return false
        event.returnValue = false;
      }
    });

    // closing
    mainWindow.on('closed', (): void => {
      // destroy window
      mainWindow.destroy();
    });

  } catch (e: unknown) {
    logger.error(e);
  }
}

// enable sandbox
app.enableSandbox();

// main app
app.on('ready', async (): Promise<void> => {
  try {
    logger.info('app: electron is ready');
    // create window
    createWindow();
    // icons
    const icon: Electron.NativeImage = nativeImage.createFromPath(path.join(globalRootPath, 'assets', 'bungo.ico'));
    // tray
    const mainTray: Electron.Tray = new Tray(icon);
    // context menu
    const contextMenu: Electron.Menu = Menu.buildFromTemplate([
      // show
      {
        label: '表示',
        click: () => {
          mainWindow.show();
        }
      },
      // close
      {
        label: '閉じる',
        click: () => {
          app.quit();
        }
      }
    ]);
    // context menu
    mainTray.setContextMenu(contextMenu);
    // Wclick reopen
    mainTray.on('double-click', () => mainWindow.show());

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // error message
      dialogMaker.showmessage('error', e.message);
    }
  }
});

// activate
app.on('activate', (): void => {
  // no window
  if (BrowserWindow.getAllWindows().length === 0) {
    // reload
    createWindow();
  }
});

// close
app.on('before-quit', (): void => {
  // turn on close flg
  isQuiting = true;
});

// end
app.on('window-all-closed', (): void => {
  logger.info('app: close app');
  // exit
  app.quit();
});

/*
 IPC
*/
// exit
ipcMain.on('exitapp', async (): Promise<void> => {
  try {
    logger.info('ipc: exit mode');
    // selection
    const selected: number = dialogMaker.showQuetion('question', '終了', '終了していいですか');
    // when yes
    if (selected == 0) {
      // close
      app.quit();
    }

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // error message
      dialogMaker.showmessage('error', e.message);
    }
  }
});

// scrape
ipcMain.on('scrape', async (event: any, arg: any): Promise<void> => {
  try {
    logger.info('ipc: titlescrape mode');
    // success Counter
    let successCounter: number = 0;
    // fail Counter
    let failCounter: number = 0;
    // finaljson
    let finalJsonArray: any[] = [];
    // num data
    const numArray: number[] = makeNumberRange(1, myNums.MAX_PAGES);
    // init scraper
    await puppScraper.init(true);

    // URL
    for await (const i of numArray) {
      try {
        // tmpJsonArray
        let tmpJsonArray: any[] = [];
        // URL
        const bungoUrl: string = `${myConst.DEF_BUNGO_URL}${i}`;
        logger.silly(`titlescrape: scraping ${bungoUrl}`);
        // move to top
        await puppScraper.doGo(bungoUrl);
        // column loop number
        const columns: number[] = makeNumberRange(1, myNums.MAX_PAGE_ROWS);
        // loop
        for await (const j of columns) {
          try {
            // promises
            let tPromises: Promise<any>[] = [];
            // wait for 2sec
            await puppScraper.doWaitFor(500);
            // acquired bookname data
            tPromises.push(puppScraper.doSingleEval(mySelectors.bookname(j), 'innerHTML'));
            // acquired authorname data
            tPromises.push(puppScraper.doSingleEval(mySelectors.authorname(j), 'innerHTML'));
            // bungo results
            const bungoResult: any = await Promise.all(tPromises);
            // not empty
            if (bungoResult.length > 0) {
              // set to array
              tmpJsonArray.push(bungoResult);
            }
            console.log(bungoResult);

          } catch (err1: unknown) {
            logger.error(err1);
          }
        }
        // increment success counter
        successCounter++;
        // set to finalArray
        finalJsonArray.push(tmpJsonArray);

      } catch (err2: unknown) {
        logger.error(err2);
        failCounter++;

      } finally {
        // URL
        event.sender.send('statusUpdate', {
          status: '収集中...', // status
          target: `${i} ページ` // page
        });
      }
    }
    console.log(finalJsonArray);
    // finaljson
    let csvJsonArray: any[] = [];
    // all races
    finalJsonArray.flat().forEach((book: any) => {
      // empty array
      let tmpObj: { [key: string]: string } = {
        bookname: '', // bookname
        authorname: '', // authorname
      };
      // set each value
      tmpObj.bookname = book[0];
      tmpObj.authorname = book[1];
      // set to json
      csvJsonArray.push(tmpObj);
    });
    logger.debug('titlescrape: making csv...');
    // nowtime
    const nowTimeStr: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
    // desktop path
    const filePath: string = path.join(dir_desktop, nowTimeStr + '.csv');
    console.log(csvJsonArray);
    // write data
    await csvMaker.makeCsvData(csvJsonArray, myColumns.BOOK_COLUMNS, filePath);

  } catch (err4: unknown) {
    logger.error(err4);
  } finally {
    // end message
    dialogMaker.showmessage('info', '終了しました。');
    logger.info('ipc: titlescrape completed');
  }
});

/*
 Functions
*/
// number array
const makeNumberRange = (start: number, end: number) => [...new Array(end - start).keys()].map(n => n + start);
