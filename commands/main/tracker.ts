import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";

import { Setting } from "../../models/files";
import { localizer } from "../../utils/localization";
import { logger } from "../../utils/logger";
import { Item } from "../../utils/util";
const sd = require('silly-datetime'); //讀取silly-datetime模塊

/**
 * Log介面
 * 
 * 如果 totalTime 為空會自動計算 startTime 與 endTime 的總[秒]差
 * 
 * @param { Map<string,number> } items - 總拾取數
 * @param { Date | undefined } startTime - 開始時間(可選)
 * @param { Date | undefined } endTime - 結束時間(可選)
 * @param { boolean | undefined } isPartTime - 是否為指定的部分時間(可選) 預設為true
 */
interface ITrackLog{
    items:Map<string,number>;
    startTime?:Date | undefined;
    endTime?:Date | undefined;
    isPartTime?: boolean | undefined;
    settings:Setting;
}
/**
 * 拾取紀錄Log類別(透過 ITrackLog interface 建立)
 * 
 * average會自動維護
 * 
 * 如果 isPartTime 為 true，將會計算setting指定的時間段平均
 * 
 * @param { Date | number } startTime - 開始時間 or 總秒數
 * @param { Date } endTime - 結束時間
 * @param { number } totalTime - 總秒數
 * @param { boolean } isPartTime - 是否為部分時間
 * @param { Map<string,number> } items - 總拾取數
 * @param { Map<string,string> } average - 平均拾取數
 */
export class TrackLog implements ITrackLog{
    startTime:Date | undefined;
    endTime:Date | undefined;
    totalTime:number;
    items : Map<string,number>;
    isPartTime: boolean;
    average : Map<string,string>;
    settings: Setting;

    map:Map<string,string> = new Map<string,string>();

    /**
     * 轉換成字串
     * @returns { string[] } TrackLog的所有資訊
     */
    toString():string[]
    {
        logger.i("進入toString，將TrackLog物件轉換成字串陣列")
        const sList:string[] = []
        this.map.set("totalTime",this._formatTime(this.totalTime))
        sList.push(localizer.format("TRACK_BANNER",this.map) as string)
        sList.push(localizer.format("TRACK_TIME",this.map) as string)
        sList.push(localizer.format("TRACK_MAIN_TITLE",this.map) as string)
        sList.push(localizer.format("TRACK_SUB_TITLE",this.map) as string)
        this.items.forEach((value,key)=>{
            this.map.set("name",key)
            this.map.set("amount",value.toString())
            sList.push(localizer.format("TRACK_SUB_ITEM",this.map) as string)
        })
        sList.push(localizer.format("TRACK_THIRD_TITLE",this.map) as string)
        this.average.forEach((value,key)=>{
            this.map.set("name",key)
            this.map.set("efficiency",value)
            sList.push(localizer.format("TRACK_THIRD_ITEM",this.map) as string)
        })
        sList.push(localizer.format("TRACK_BANNER",this.map) as string)
        return sList
    }
    /**
     * 轉換成json物件
     * @returns { any } json物件
     */
    toJson():{}
    {
        return {
            startTime: sd.format(this.startTime, 'YYYY/MM/DD HH:mm:ss'),
            endTime: sd.format(this.endTime, 'YYYY/MM/DD HH:mm:ss'),
            totalTime: this._formatTime(this.totalTime),
            isPartTime: this.isPartTime,
            items: Object.fromEntries(this.items),
            average: Object.fromEntries(this.average),
        };
    }

    /**
     * 內部函數，用來設定average map
     * @returns { Map<string,string> } 平均值
     */
    _setAverage():Map<string,string>
    {
        logger.i("進入_setAverage，設定平均")
        const map = new Map<string,string>();
        this.items.forEach((value, key) => {
            map.set(key,this._calculateAverage(value))
        });
        return map
    }

    /**
     * 內部函數，格式化時間(天:小時:分:秒)
     * @param { number } totalTime - 秒數
     * @returns { string } 格式化後的時間
     */
    _formatTime(totalTime: number): string 
    {
        logger.i("進入_formatTime，格式化時間")
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
     * 內部函數，計算平均
     * @param { number } itemCount - 物品數量
     * @returns { string } 計算結果
     */
    _calculateAverage(itemCount:number):string 
    {
        logger.i("進入_calculateAverage，計算平均")
        let s = ""
        if (this.isPartTime)
        {
            logger.d("為部分時間")
            s = `${itemCount}個/${this._formatTime(this.settings.track_record)}`
        }
        else
        {
            logger.d("不為部分時間")
            const time:number = Number((this.totalTime / this.settings.track_record).toFixed(1))
            s = `${Number((itemCount / time).toFixed(1))}個/${this._formatTime(this.settings.track_record)}`
        }
        logger.d(`回傳計算平均結果: ${s}`)
        return s 
    }

    constructor(obj:ITrackLog)
    {
        logger.i("建立TrackLog物件")
        this.startTime = obj.startTime ?? undefined;
        this.endTime = obj.endTime ?? undefined;
        this.totalTime = Math.floor((this.endTime!.getTime() - this.startTime!.getTime()) / 1000);
        this.isPartTime = obj.isPartTime ?? true;
        this.items = obj.items;
        this.settings = obj.settings;
        this.average = this._setAverage();
    }
    


}
export class Tracker 
{
    settings:Setting;
    totalCollection:Map<string,number> = new Map<string,number>;
    partTimeCollection:Map<string,number> = new Map<string,number>;
    startTime:Date | null = null;
    partStartTime:Date | null = null;
    trackPartTimeInterval:NodeJS.Timer | null = null;
    logList:TrackLog[] = [];

    //Summoned to wait by CONSOLE
    //Summoned to server41 by CONSOLE

    /**
     * 開始追蹤
     * @param bot - bot實例
     */
    track(bot:Bot)
    {
        logger.i("進入track，開始追蹤紀錄，並註冊playerCollect")
        this.startTime = new Date()
        // 一開始的時間是一樣的
        this.partStartTime = this.startTime
        logger.i(`現在時間: ${sd.format(this.startTime, 'YYYY/MM/DD HH:mm:ss')}，開始記錄`)
        bot.on("playerCollect",(collector:Entity,collected:Entity)=>{
            if ((collector.username ? collector.username : "") === bot.username)
            {
                logger.d(`拾取者: ${collector.username ? collector.username : ""}`);
                if (collected.name === "item")
                {
                    const object: any = collected.metadata.filter((value) => value !== undefined)[0];
                    const itemId = object["itemId"] as number;
                    const itemCount = Math.abs(object["itemCount"] as number)
                    const item = new Item(itemId,itemCount)
                    logger.d(`拾取的物品ID: ${itemId}`)
                    logger.d(`拾取的物品: ${item.name}`);
                    logger.d(`拾取的數量: ${item.count}`);
                    
                    if (this.settings.track_list.includes(itemId))
                    {
                        logger.d(`存在於追蹤物品清單中`);
                        //總表
                        if (this.totalCollection.has(item.name))
                        {
                            logger.d(`已添加進總表，修改物品數量`);
                            logger.d(`修改前的數量為 ${this.totalCollection.get(item.name)}`);
                            this.totalCollection.set(item.name,(this.totalCollection.get(item.name)!+itemCount))
                            logger.d(`修改後的數量為 ${this.totalCollection.get(item.name)}`);
                        }
                        else
                        {
                            logger.d(`添加進總表`);
                            this.totalCollection.set(item.name,itemCount)  
                        }
                        //部分時間表
                        if (this.partTimeCollection.has(item.name))
                        {
                            logger.d(`已添加進部分時間表，修改物品數量`);
                            logger.d(`修改前的數量為 ${this.partTimeCollection.get(item.name)}`);
                            this.partTimeCollection.set(item.name,(this.partTimeCollection.get(item.name)!+itemCount))
                            logger.d(`修改後的數量為 ${this.partTimeCollection.get(item.name)}`);
                        }
                        else
                        {
                            logger.d(`添加進部分時間表`);
                            this.partTimeCollection.set(item.name,itemCount)  
                        }
                       
                    }
                }
            }
        })
        this.trackPartTimeInterval = setInterval(()=>{
            const endTime = new Date() //取得當前時間做為結束時間
            const log = new TrackLog({
                items:this.partTimeCollection,
                settings:this.settings,
                startTime:this.partStartTime as Date,
                endTime:endTime
            })
            if(this.logList.length === 10)
            {
                logger.d(`已達指定暫存上限，清除暫存`);
                //是否要寫入log檔
                    //寫入log
                this.logList = [];
            }
            else
            {
                logger.d(`將log添加進暫存內`);
                this.logList.push(log);
                if(this.settings.enable_track_log)
                {
                    logger.d(`有開啟拾取紀錄log，記錄至檔案`);
                    logger.writeTrackLog(log);
                }
            }

            // 一個的結束就是另一個的開始
            this.partStartTime = endTime;
            //清空map暫存
            this.partTimeCollection.clear();


        },this.settings.track_record * 1000);
    }
    
    /**
     * 取消追蹤
     * @param bot - bot實例
     */
    trackDown(bot:Bot)
    {
        logger.i("進入trackDown，取消監聽 playerCollect 與關閉Interval")
        bot.removeAllListeners('playerCollect')
        clearInterval(this.trackPartTimeInterval as NodeJS.Timer)
        if(this.settings.enable_track_log)
        {
            logger.d("有開啟紀錄，儲存當前拾取紀錄log")
            logger.writeTrackLog(new TrackLog({
                items:this.partTimeCollection,
                settings:this.settings,
                startTime:this.partStartTime as Date,
                endTime:new Date()
            }))
        }
    }

    /**
     * 取得當前紀錄
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 發送指令的玩家ID
     */
    getCurrentTrackLog(bot:Bot,playerId:string,args:string[])
    {
        logger.i("進入getCurrentTrackLog，取得當前拾取紀錄")
        let track:TrackLog = new TrackLog({
            items:this.partTimeCollection,
            settings:this.settings,
            startTime:this.partStartTime as Date,
            endTime:new Date()
        });
        if(args.length === 2)
        {
            logger.d("參數數量為2")
            try
            {
                logger.d(args[1])
                logger.d(this.logList.length)
                const index = parseInt(args[1], 10); // 嘗試將 args[1] 解析為數字
                if (isNaN(index)) 
                {
                    throw new Error(`參數輸入錯誤，輸入的參數為: ${args[1]}`);
                }
                if(index > this.logList.length)
                {
                    track = this.logList[this.logList.length-1]
                }
                else if(index <= 0)
                {
                    throw new Error(`參數輸入錯誤，輸入的參數為: ${args[1]}`);
                }
                else
                {
                    track = this.logList[index - 1] 
                }      
            }
            catch(e:any)
            {
                logger.e(`參數輸入錯誤，輸入的參數為: ${args[1]}`)
                bot.chat(`/m ${playerId} ${localizer.format("TRACK_ERROR")}`);
                return;
            }
        }

        track.toString().forEach((str, index) => {
            setTimeout(()=>{
            bot.chat(`/m ${playerId} ${str}`);
            },500 * index);
        })

        track.toString().forEach((str, index) => {
            logger.l(str);
        })
    }

    /**
     * 取得所有紀錄
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 發送指令的玩家ID
     */
    getFullTrackLog(bot:Bot,playerId:string)
    {
        logger.i("進入getFullTrackLog，取得所有拾取紀錄")
        const track = new TrackLog({
            items:this.totalCollection,
            settings:this.settings,
            startTime:this.startTime as Date,
            endTime:new Date(),
            isPartTime:false,
        })
        track.toString().forEach((str, index) => {
            setTimeout(()=>{
             bot.chat(`/m ${playerId} ${str}`);
            },500 * index);
         })
        track.toString().forEach((str, index) => {
            logger.l(str);
        }) 
    }

    constructor(settings:Setting)
    {
        logger.i("建立Tracker物件")
        this.settings = settings;
    }
}