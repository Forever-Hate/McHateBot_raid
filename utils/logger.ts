import fs from "fs"; //讀取fs模塊

import { Setting } from '../models/files';
import { LoggerInterface } from '../models/modules';
import { TrackLog } from "../commands/main/tracker";
const sd = require('silly-datetime'); //讀取silly-datetime模塊
export let logger:Log

export class Log implements LoggerInterface
{
  settings:Setting

  /**
   * 寫入錯誤log
   * @param { any } e - 錯誤
   */
  writeErrorLog(e:any):void
  {
    const time = sd.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
    fs.writeFileSync(`./logs/${time}.txt`, e.toString());
  }
  /**
   * 寫入兌換紀錄log
   * @param { string } playerId - 下指令的玩家ID 
   * @param { string } itemName - 兌換的物品名稱
   * @param { number } times - 兌換次數
   */
  writeExchangeLog(playerId: string, itemName: string, times: number):void
  {
    const time = sd.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
    const logMessage = `時間: [${time}], 指令執行者: [${playerId}], 交換物品: [${itemName}], 交換次數:[${times}]\r\n`;

    if (fs.existsSync(`./exchange_logs/logs.txt`)) 
    {
      fs.appendFileSync(`./exchange_logs/logs.txt`, logMessage);
    } 
    else 
    {
      fs.writeFileSync(`./exchange_logs/logs.txt`, logMessage);
    }
  }
  /**
   * 寫入統計紀錄log
   * @param { TrackLog } trackLog - trackLog物件
   */
  writeTrackLog(trackLog:TrackLog):void
  {
    this.i("進入writeTrackLog，撰寫TrackLog");

    let logsObject: { list: any[] } = { list: [] };

    if (fs.existsSync(`./track_logs/logs.txt`)) {
        this.d("已撰寫過拾取紀錄Log，附加檔案");

        // 讀取現有的 JSON 檔案
        const existingData = fs.readFileSync(`./track_logs/logs.txt`, 'utf8');

        try {
            // 如果現有的資料是有效的 JSON，則解析它
            const parsedData = JSON.parse(existingData);

            // 檢查它是否有 'list' 屬性
            if (parsedData && Array.isArray(parsedData.list)) {
                logsObject = parsedData;
            }
        } catch (error:any) {
            this.e(`解析現有 JSON 資料時出錯：${error}`);
        }

        // 將新的 trackLog 附加到 'list' 陣列中
        logsObject.list.push(trackLog.toJson());

        // 將更新後的 JSON 寫回檔案
        fs.writeFileSync(`./track_logs/logs.txt`, JSON.stringify(logsObject, null, 2));
    } 
    else 
    {
        this.d("未撰寫過拾取紀錄Log，建立一個新的檔案");

        // 創建一個具有空 'list' 屬性的新物件，並將 trackLog 添加到其中
        logsObject.list.push(trackLog.toJson());

        // 將 JSON 物件寫入新檔案
        fs.writeFileSync(`./track_logs/logs.txt`, JSON.stringify(logsObject, null, 2));
    }
  }
  
  e(msg: any):void
  {
    if(process.env.DEBUG! === "true")
    {
      console.error(msg);
    }
  }

  d(msg: any):void
  {
    if(process.env.DEBUG! === "true")
    {
      console.debug(msg)
    }
  }

  i(msg: any):void
  {
    if(process.env.DEBUG! === "true")
    {
      console.info(msg)
    }
  }

  l(msg: any):void
  {
    console.log(msg);
  }

  constructor(settings:Setting)
  {
    this.i("建立Log物件")
    this.settings = settings;
    //建立資料夾
    fs.mkdir('./logs', { recursive: true }, (err) => {
      if (err) throw err;
    });
    //建立資料夾
    if (settings.enable_exchange_logs) 
    {
      this.d("已開啟兌換紀錄")
      fs.mkdir('./exchange_logs', { recursive: true }, (err) => {
        if (err) throw err;
      });
    }
    //建立資料夾
    if (settings.enable_track_log) 
    {
      this.d("已開啟統計紀錄")
      fs.mkdir('./track_logs', { recursive: true }, (err) => {
        if (err) throw err;
      });
    }
  }

}

export default function setLogger(settings:Setting)
{
  logger = new Log(settings);
  logger.i("進入setLogger，建立一個新的Log物件")
}

