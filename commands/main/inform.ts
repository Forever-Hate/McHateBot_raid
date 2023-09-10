import { Bot } from "mineflayer";
import { InformInterface } from "../../models/modules";
import { localizer } from "../../utils/localization";
import { logger } from "../../utils/logger";

export class Informer implements InformInterface
{
    map = new Map<string, any>();
    version_str: string = process.env.VERSION!;
    author_dc: string = process.env.AUTHOR_DC!;
    author_id: string = process.env.AUTHOR_ID!;

    /**
     * 查詢當前經驗值
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 下指令的玩家ID
     */
    experience(bot: Bot, playerId: string):void
    {
        logger.i("進入experience，查詢此bot的經驗值")
        this._setMap(bot);
        bot.chat(`/m ${playerId} ${localizer.format("EXP", this.map)}`);
    }

    /**
     * 查詢指令
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 下指令的玩家ID
     */
    help(bot: Bot, playerId: string):void
    {
        logger.i("進入help，查詢此bot的指令")
        this._setMap(bot);
        bot.chat(`/m ${playerId} ${localizer.format("HELP", this.map)}`);
        (localizer.format("COMMAND_LIST") as string[]).forEach((str, index) => {
            logger.l(str);
        }) 
    }

    /**
     * 查詢當前bot版本
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 下指令的玩家ID
     */
    version(bot: Bot, playerId: string):void
    {
        logger.i("進入version，查詢此bot的版本")
        this._setMap(bot);
        bot.chat(`/m ${playerId} ${localizer.format("VERSION", this.map)}`);
    }

    /**
     * 查詢關於此bot的資訊
     * @param { Bot } bot - bot實例
     * @param { string } playerId - 下指令的玩家ID
     */
    about(bot: Bot, playerId: string):void
    {
        logger.i("進入about，查詢此bot的資訊")
        this._setMap(bot);
        let content: string[] = localizer.format("ABOUT", this.map) as string[];
        content.forEach((c: string, index: number) => {
            setTimeout(() => {
                bot.chat(`/m ${playerId} ${c}`);
            }, 500 * (index + 1));
        });
    }

    /**
     * 內部函數，建立變數的映射值
     */
    _setMap(bot: Bot) 
    {
        logger.i("設定變數的映射值")
        this.map.set("level", bot.experience.level);
        this.map.set("points", bot.experience.points);
        this.map.set("percent", Math.round(bot.experience.progress * 100));
        this.map.set("version", this.version_str);
        this.map.set("author_dc", this.author_dc);
        this.map.set("author_id", this.author_id);
    }
    
    constructor()
    {
        logger.i("建立Informer物件")
    }

}

