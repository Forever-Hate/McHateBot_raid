const sd = require('silly-datetime'); //讀取silly-datetime模塊
import { APIEmbedField } from "discord.js";
import { Bot } from "mineflayer"
import net from 'net';
import { Window } from 'prismarine-windows';
import ItemVersions from 'prismarine-item';

import { logger } from "./logger"
import { TrackLog } from "../commands/main/tracker";
import { Config, Setting } from "../models/files";

export let config:Config,Item:any,settings:Setting;

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
        const timeout:NodeJS.Timeout = setInterval(()=>{
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

/**
 * 添加千分位標記
 * @param { number } number - 要轉換的數字
 * @returns { string } 添加後的結果
 */
export function formatThousandths(number: number): string 
{
    logger.i("進入formatThousandths，添加千分位")
    let comma = /\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g;
    return number.toString().replace(comma, ',');
}

/**
 * 格式化時間(天:小時:分:秒)
 * @param { number } totalTime - 秒數
 * @returns { string } 格式化後的時間
 */
export function formatTime(totalTime: number): string 
{
    logger.i("進入formatTime，格式化時間")
    const days:number = Math.floor(totalTime / 86400); 
    const hours:number = Math.floor((totalTime % 86400) / 3600);
    const minutes:number = Math.floor((totalTime % 3600) / 60);
    const seconds:number = totalTime % 60;
  
    let result:string = '';
  
    if (days > 0) 
    {
      result += `${days}天`;
    }
    if (hours > 0) 
    {
      result += `${hours}小時`;
    }
    if (minutes > 0) 
    {
      result += `${minutes}分`;
    }
    if (seconds > 0 || result === '') 
    {
      result += `${seconds}秒`;
    }
    logger.d(`回傳格式化時間結果: ${result}`)
    return result;
}

/**
 * 建立TrackLog Embed Field
 * @param { TrackLog } track 拾取紀錄
 * @returns { APIEmbedField[] } 欄位內容
 */
export function getDiscordTrackLogEmbedField(track:TrackLog):APIEmbedField[]
{
    //初始欄位 '\u200b'為空字元
    const fields:APIEmbedField[] = [
        {
            name: '綠寶石儲存量:',
            value: track.items.has("emerald") ? `${formatThousandths(track.items.get("emerald")!)}個` : "未拾取到綠寶石或沒有紀錄",
        },
        {
            name:"開始時間:",
            value:sd.format(track.startTime, 'YYYY/MM/DD HH:mm:ss'),
            inline:false
        },
        {
            name:"結束時間:",
            value:sd.format(track.endTime, 'YYYY/MM/DD HH:mm:ss'),
            inline:false
        },
        {
            name:"總長度:",
            value:formatTime(track.totalTime),
            inline:false
        },
    ]
    //添加物品
    if(track.items.size !== 0)
    {
        //判斷是否已經放標題
        let isPutTitle:boolean = false;
        track.items.forEach((value,key)=>{
            if(!isPutTitle)
            {
                //添加物品標題
                fields.push({
                    name:'物品一覽:',
                    value:`${key}\n${formatThousandths(value)}個\n約${formatThousandths(Math.floor(value / 64))}組`,
                    inline:true
                })
                isPutTitle = true
            }
            else
            {
                fields.push({
                    name:'\u200b',
                    value:`${key}\n${formatThousandths(value)}個\n約${formatThousandths(Math.floor(value / 64))}組`,
                    inline:true
                })
            }
        })

        //填補空白
        const remaind = track.items.size % 3;
        for (let i = 1; i < remaind; i++) 
        {
            fields.push({
                name: '\u200b',
                value: '\u200b',
                inline: true,
            });
        }
    }
    else
    {
        fields.push({
            name:"物品一覽:",
            value:'空',
            inline:false
        })
    }
    //添加效率
    if(track.average.size !== 0)
    {
        //判斷是否已經放標題
        let isPutTitle:boolean = false;
        track.average.forEach((value,key)=>{
            if(!isPutTitle)
            {
                //添加效率標題
                fields.push({
                    name:'效率一覽:',
                    value:`${key}:\n${value}`,
                    inline:true
                })
                isPutTitle = true;
            }
            else
            {
                fields.push({
                    name:'\u200b',
                    value:`${key}:\n${value}`,
                    inline:true
                })
            }
        })

        //填補空白
        const remaind = track.average.size % 3;
        for (let i = 1; i < remaind; i++) {
            fields.push({
                name: '\u200b',
                value: '\u200b',
                inline: true,
            });
        }
    }
    else
    {
        fields.push({
            name:"效率一覽:",
            value:'空',
            inline:true
        })
    }
    
    return fields;
}
/**
 * 取得settings
 */
export function getSettings()
{
    delete require.cache[require.resolve(`${process.cwd()}/settings.json`)]; //清除暫存
    settings = require(`${process.cwd()}/settings.json`) //讀取設定檔案
}
/**
 * 取得config
 */
export function getConfig()
{
    delete require.cache[require.resolve(`${process.cwd()}/config.json`)]; //清除暫存
    config = require(`${process.cwd()}/config.json`)  //讀取config檔案
}

/**
 * 取的可用的port
 * @param { number } startPort 起始port 
 * @returns { Promise<number> } 可用的port
 */
export function getAvailablePort(startPort: number): Promise<number> {
    const server = net.createServer();
    server.unref();
    return new Promise((resolve, reject) => {
        server.on('error', () => {
            // 如果當前 port 被占用，則嘗試下一個 port
            server.close(() => {
                getAvailablePort(startPort + 1).then(resolve).catch(reject);
            });
        });
        server.listen(startPort, () => {
            const { port } = server.address() as net.AddressInfo;
            server.close(() => {
                resolve(port);
            });
        });
    });
}

/**
<<<<<<< HEAD
 * 替換所有換行符號 (U+000A, U+000D) 為空格
 * @param { string } text 原始字串
 * @returns { string } 處理過的字串
 */
export function replaceNewlines(text: string): string {
    return text.replace(/(?:\r\n|\r|\n)/g, ' ');
=======
 * 去除所有 CR 符號 (U+000D)
 * @param { string } text 原始字串
 * @returns { string } 處理過的字串
 */
export function removeCarriageReturns(text: string): string {
    return text.replace(/\r/g, '');
>>>>>>> 53a425fc59ef35ff0f3661be3f717ecac344d18c
}
