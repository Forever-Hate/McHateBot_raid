import { Bot } from "mineflayer";

import { Setting } from "../../models/files";
import { AnnounceInterface } from "../../models/modules";
import { localizer } from "../../utils/localization";
import { logger } from "../../utils/logger";


export class Announcer implements AnnounceInterface
{
    settings:Setting;
    trade_content: string[] = []; // 宣傳文字
    trade_content_index: number = 0; // 宣傳文字index
    skip_count: number = 0; // 該訊息被跳過的次數
    now_trade_content_cycle_index: number = 0; // 當前循環的 index
    map: Map<string, number | string[]> = new Map();
    announceInterval: NodeJS.Timer | null = null;
    /**
     * 設定一個Interval 進行宣傳
     * @param { Bot } bot - bot實例
     */
    startAnnounce(bot: Bot):void
    {
        logger.i("進入startAnnounce，設定Interval進行宣傳")
        this.announceInterval = setInterval(() => {
        this.trade_content = this.settings.trade_content[this.trade_content_index]; // 初始化宣傳文字
        //將每一句間隔0.5秒發送出去
        this.trade_content.forEach((c, index) => {
            setTimeout(()=>{
            bot.chat(`${c}`);
            }, 500 * (index + 1));
        });

        //是否有開啟訊息循環
        if (this.settings.enable_trade_content_cycle)
        {
            logger.d("開啟循環播送宣傳訊息")
            //是否顯示特殊訊息次數為1
            if (this.settings.content_skip_count === 1) 
            {
                logger.d("顯示特殊訊息次數為1")
                //換下一個訊息群組
                this.trade_content_index = this.trade_content_index + 1;
                //是否訊息群組已經播送到最後一個
                if (this.trade_content_index === this.settings.trade_content.length) 
                {
                    this.trade_content_index = 0;
                }
            } 
            else
            {
                logger.d(`顯示特殊訊息次數不為1 設定值為:${this.settings.content_skip_count}`)
                //顯示特殊訊息次數+1
                this.skip_count = this.skip_count + 1;
                //是否顯示特殊訊息次數已到設定值
                if (this.skip_count === this.settings.content_skip_count) 
                {
                    this.now_trade_content_cycle_index = this.trade_content_index;
                    this.trade_content_index = 0;
                    this.skip_count = 0;
                } 
                else 
                {
                    //看不太懂在幹嘛
                    if (this.skip_count === 1) // 剛顯示過特殊訊息
                    {
                        this.trade_content_index = this.now_trade_content_cycle_index + 1;
                        if (this.trade_content_index === this.settings.trade_content.length) 
                        {
                            this.trade_content_index = 1;
                        }
                    } 
                    else 
                    {
                        this.trade_content_index = this.trade_content_index + 1;
                        if (this.trade_content_index === this.settings.trade_content.length) 
                        {
                            this.trade_content_index = 1;
                        }
                    }
                }
            }
        }
        }, this.settings.trade_announce_cycleTime * 1000);
    }
    /**
     * 停止宣傳Interval
     */
    stopAnnounceInterval():void
    {
        logger.i("進入stopAnnounceInterval，停止宣傳Interval")
        if (this.announceInterval)
        {
            clearInterval(this.announceInterval);
        }
    }
    /**
     * 切換下一次的宣傳訊息
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 下指定的玩家ID
     */
    switchAnnouncement(bot: Bot, playerId: string):void
    {
        logger.i("進入switchAnnouncement，切換宣傳群組")
        if (this.settings.trade_content.length === 1) 
        {
            //設定映射值
            this._setMap()
            bot.chat(`/m ${playerId} ${localizer.format("NEED_MORE_CONTENT", this.map)}`);
        } 
        else 
        {
            this.trade_content_index = this.trade_content_index + 1;
            if (this.trade_content_index === this.settings.trade_content.length) 
            {
                this.trade_content_index = 0;
            }
            this.trade_content = this.settings.trade_content[this.trade_content_index];
            //設定映射值
            this._setMap()
            bot.chat(`/m ${playerId} ${localizer.format("NEXT_INDEX",this.map)}`);
            bot.chat(`/m ${playerId} ${localizer.format("CONTENT",this.map)}`);
        }
    }
    
    /**
     * 內部函數，建立變數的映射值
     */
    _setMap() 
    {
        logger.i("設定變數的映射值")
        this.map.set("trade_content_index", this.trade_content_index);
        this.map.set("trade_content", this.trade_content);
    }
    
    constructor(settings:Setting)
    {
        logger.i("建立Announcer物件")
        this.settings = settings;
    }
}


