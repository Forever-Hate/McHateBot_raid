import { Bot } from "mineflayer"
import { Window } from 'prismarine-windows';
import ItemVersions from 'prismarine-item';

import { logger } from "./logger"

export let Item:any;

/**
 * 取得輸入指令後彈出的視窗實例
 * @param { Bot } bot - bot實例 
 * @param { string } category - 視窗名稱 
 * @returns { Promise<Window> } Promise<Window實例>
 */
export function get_window(bot:Bot, category:string):Promise<Window> 
{
    logger.i(`進入get_window，取得${category} window實例`)
    return new Promise(((resolve,reject) => {
        bot.chat(`/${category}`)
        bot.once("windowOpen", function o(window) {
            clearInterval(timeout)
            resolve(window);
        })
        const timeout:NodeJS.Timer = setInterval(()=>{
            reject();
        },5000)
    }))
}

/**
   * 初始化函數，建立minecraft物件類型
   * 
   * 因需要bot物件依賴，故無法在初始化時宣告
   * 
   * @param { Bot } bot - bot實例
  */
export default function setItemVersion(bot:Bot)
{
    logger.i(`進入setItemVersion，取得minecraft Item類型`)
    Item = ItemVersions(bot.version);
}