import { Entity } from "prismarine-entity";
import { localizer } from "../../utils/localization";
import { logger } from "../../utils/logger";
import { Item, formatThousandths, formatTime, settings } from "../../utils/util";
import { bot } from "./bot";
import { Route, websocketClient } from "../websocket/websocket";
const sd = require('silly-datetime'); //讀取silly-datetime模塊

export let tracker:Tracker;
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

    map:Map<string,string> = new Map<string,string>();

    /**
     * 轉換成字串
     * @returns { string[] } TrackLog的所有資訊
     */
    toString():string[]
    {
        logger.i("進入toString，將TrackLog物件轉換成字串陣列")
        const sList:string[] = []
        this.map.set("totalTime",formatTime(this.totalTime))
        sList.push(localizer.format("TRACK_BANNER",this.map) as string)
        sList.push(localizer.format("TRACK_TIME",this.map) as string)
        sList.push(localizer.format("TRACK_MAIN_TITLE",this.map) as string)
        sList.push(localizer.format("TRACK_SUB_TITLE",this.map) as string)
        this.items.forEach((value,key)=>{
            this.map.set("name",key)
            this.map.set("amount",formatThousandths(value))
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
            totalTime: formatTime(this.totalTime),
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
            s = `${formatThousandths(itemCount)}個/${formatTime(settings.track_record)}`
        }
        else
        {
            logger.d("不為部分時間")
            const time:number = Number((this.totalTime / settings.track_record).toFixed(1)) < 1 ? 1 : Number((this.totalTime / settings.track_record).toFixed(1))
            s = `${formatThousandths(Number((itemCount / time).toFixed(1)))}個/${formatTime(settings.track_record)}`
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
        this.average = this._setAverage();
    }
    


}
export class Tracker 
{
    totalCollection:Map<string,number> = new Map<string,number>;
    partTimeCollection:Map<string,number> = new Map<string,number>;
    startTime:Date | null = new Date(); //程式一開始就記錄時間(這樣就不會因為斷線而修改開始時間)
    partStartTime:Date | null = null;
    trackPartTimeInterval:NodeJS.Timeout | null = null;
    logList:TrackLog[] = [];

    /**
     * 開始追蹤
     */
    track()
    {
        logger.i("進入track，開始追蹤紀錄，並註冊playerCollect")
        // 重新取得時間(可能剛開機時會有1-2秒的誤差)
        this.partStartTime = new Date();
        logger.i(`現在時間: ${sd.format(this.partStartTime, 'YYYY/MM/DD HH:mm:ss')}，開始記錄`)
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
                    
                    if (settings.track_list.includes(item.name))
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
    }
    
    /**
     * 取消追蹤
     */
    // trackDown()
    // {
    //     logger.i("進入trackDown，取消監聽 playerCollect")
    //     bot.removeAllListeners('playerCollect')
    // }
    
    /**
     * 重新更新trackInterval
     */
    reloadTrack()
    {
        logger.i("進入reloadTrack，重新更新trackInterval")
        if(this.trackPartTimeInterval)
        {
            clearInterval(this.trackPartTimeInterval);
        }
        this.trackPartTimeInterval = setInterval(()=>{
            const endTime = new Date() //取得當前時間做為結束時間
            const log = new TrackLog({
                items:new Map(this.partTimeCollection), //建立一個新的Map參考
                startTime:this.partStartTime as Date,
                endTime:endTime
            })
            logger.d(`將log添加進暫存內`);
            this.logList.push(log);
            if(settings.enable_track_log)
            {
                logger.d(`有開啟拾取紀錄log，記錄至檔案`);
                logger.writeTrackLog(log);
            }

            //檢查是否大於25個元素
            if (this.logList.length > 25) 
            {
                this.logList.shift(); //移除第一個元素
            }

            // 一個的結束就是另一個的開始
            this.partStartTime = endTime;
            //清空map暫存
            this.partTimeCollection.clear();

        },settings.track_record * 1000);
    }
    /**
     * 取得當前紀錄
     * @param { string } playerId - 發送指令的玩家ID
     * @param { string[] } args - 指令參數
     */
    getCurrentTrackLog(playerId:string,args:string[])
    {
        logger.i("進入getCurrentTrackLog，取得當前拾取紀錄")
        let track:TrackLog | undefined;
        if(args.length === 2)
        {
            const result:TrackLog | string = this.getTrackLog(true,args[1]);
            if(result instanceof TrackLog)
            {
                track =  result;
            }
            else
            {
                logger.e(`參數輸入錯誤，輸入的參數為: ${args[1]}`)
                bot.chat(`/m ${playerId} ${result}`);
                return;
            }
            
        }
        else
        {
            track = this.getTrackLog(true) as TrackLog;
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
     * @param { string } playerId - 發送指令的玩家ID
     */
    getFullTrackLog(playerId:string)
    {
        logger.i("進入getFullTrackLog，取得所有拾取紀錄")
        const track:TrackLog = this.getTrackLog(false) as TrackLog;
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
     * 取得紀錄
     * @param { boolean } isCurrent - 是否為當前紀錄
     * @param { number | undefined } indexString - 指定的index(僅限isCurrent = true才可定義)
     * @returns { TrackLog|string } 紀錄/錯誤訊息
     */
    getTrackLog(isCurrent:boolean,indexString:string | undefined = undefined):TrackLog | string
    {
        logger.i("進入getTrackLog，取得拾取紀錄")
        if(isCurrent)
        {
            logger.d("為當前紀錄")
            try
            {
                logger.d(`index: ${indexString}`)
                logger.d(`logLength: ${this.logList.length}`)
                if(indexString)
                {
                    logger.d("有填寫index，回傳歷史log")
                    const index = parseInt(indexString, 10); // 嘗試將 indexString 解析為數字
                    if (isNaN(index)) 
                    {
                        logger.d("無法解析成數字")
                        throw new Error(`參數輸入錯誤，輸入的參數為: ${indexString}`);
                    }
                    if(index <= 0) //index 定義範圍應為1~25
                    {
                        throw new Error(`參數輸入錯誤，輸入的參數為: ${indexString}`);
                    }
                    else if(this.logList.length == 0)
                    {
                        logger.d("未有任意一個歷史log，回傳當前log")
                        return new TrackLog({
                            items:this.partTimeCollection,
                            startTime:this.partStartTime as Date,
                            endTime:new Date()
                        });
                    }
                    else if(index > this.logList.length)
                    {
                        logger.d("超過歷史log長度，回傳最後一個歷史log")
                        return this.logList[this.logList.length-1]
                    }
                    else
                    {
                        logger.d("回傳指定查詢的歷史log")
                        return this.logList[index - 1] 
                    }      
                }
                else
                {
                    logger.d("未填寫index，回傳當前log")
                    return new TrackLog({
                        items:this.partTimeCollection,
                        startTime:this.partStartTime as Date,
                        endTime:new Date()
                    });
                }
            }
            catch(e:any)
            {
                logger.e(e.toString())
                return localizer.format("TRACK_ERROR") as string
            }
        }
        else
        {
            logger.d("為所有紀錄")
            return new TrackLog({
                items:this.totalCollection,
                startTime:this.startTime as Date,
                endTime:new Date(),
                isPartTime:false,
            })
        }
    }

    constructor()
    {
        logger.i("建立Tracker物件")
        if (settings.enable_track)
        {
            this.trackPartTimeInterval = setInterval(()=>{
                const endTime = new Date() //取得當前時間做為結束時間
                const log = new TrackLog({
                    items:new Map(this.partTimeCollection), //建立一個新的Map參考
                    startTime:this.partStartTime as Date,
                    endTime:endTime
                })
                logger.d(`將log添加進暫存內`);
                this.logList.push(log);
                if(settings.enable_track_log)
                {
                    logger.d(`有開啟拾取紀錄log，記錄至檔案`);
                    logger.writeTrackLog(log);
                }
    
                //檢查是否大於25個元素
                if (this.logList.length > 25) 
                {
                    this.logList.shift(); //移除第一個元素
                }
                
                //發送websocket
                websocketClient!.send(Route.trackLogs,JSON.stringify(this.logList.map((log)=>log.toJson())))

                // 一個的結束就是另一個的開始
                this.partStartTime = endTime;
                //清空map暫存
                this.partTimeCollection.clear();
    
            },settings.track_record * 1000);
        }
        else
        {
            setInterval(()=>{
                websocketClient!.send(Route.trackLogs,JSON.stringify({"error":"track is disabled"}));
            },settings.track_record * 1000);
        }

    }
}
export default function setTracker()
{
    logger.i("進入setTracker，建立一個新的Tracker物件")
    tracker = new Tracker();
}