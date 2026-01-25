/**
 * globalvariables.ts
 **
 * function：global variables
**/

/** const */
// default
export namespace myConst {
  export const DEVMODE: boolean = true;
  export const COMPANY_NAME: string = "nthree";
  export const APP_NAME: string = "bungoscraper";
  export const LOG_LEVEL: string = "silly";
  export const DEFAULT_ENCODING: string = "utf8";
  export const CSV_ENCODING: string = "SJIS";
  export const DEF_BUNGO_URL: string = 'https://search.bungo.app/page/';
}

// default
export namespace myNums {
  export const MAX_PAGE_ROWS: number = 50;
  export const WINDOW_WIDTH: number = 800;
  export const WINDOW_HEIGHT: number = 1000;
  export const MAX_PAGES: number = 286;
}

// columns
export namespace myColumns {
  export const BOOK_COLUMNS: string[] = [
    'bookname', 'authorname',
  ];
}

// selectors
export namespace mySelectors {
  export const bookname = (num: number): string => {
    return `body > div > main > div > div:nth-child(3) > div > table > tbody:nth-child(${num + 1}) > tr.border-t > td:nth-child(1) > a`;
  }
  export const authorname = (num: number): string => {
    return `body > div > main > div > div:nth-child(3) > div > table > tbody:nth-child(${num + 1}) > tr.border-t > td:nth-child(2) > a`;
  }
}
