import { Window } from 'prismarine-windows';
import { Entity } from 'prismarine-entity';
import ItemVersions,{ Item } from 'prismarine-item';

import { ExchangeInterface } from '../../models/modules';
import { localizer } from '../../utils/localization';
import { logger } from '../../utils/logger';
import { discardItemer } from './discarditem';
import { get_window,formatThousandths, settings } from '../../utils/util';
import { bot } from './bot';

/**
 * 所選要交換的物品class
 */
class choicedItem {
    slot: number;
    item: Item; 
    exp: string | number;
    count: number;
    /**
     * 建立一個新的 choicedItem 實例
     * @param { number } slot - 物品所在的位置
     * @param { Item } item - 物品自身實例
     * @param { number|string } exp - 物品交換所需經驗
     * @param { number } count - 物品交換一次的數量
     * @returns { choicedItem } 物件本身  
     */
    constructor(slot: number, item: Item, exp: string | number, count: number) 
    {
        this.slot = slot;
        this.item = item;
        this.exp = exp;
        this.count = count;
    }
}

export let exchangeManager:ExchangeController;

export class ExchangeController implements ExchangeInterface
{
    exchangeMap = new Map<string, choicedItem>(); 
    map = new Map<string, string>();
    exchangeFrequency = 0; //兌換次數
    exchangeAmount = 0; //兌換後剩餘的兌換次數
    exchangedItem: choicedItem | undefined; //當前交換的物品
    exchangeSets = 0; //
    exchangeQuantity = 0; //一次兌換的數量
    currentWindow: Window | null = null; //視窗實例
    exchangePosition: string = ""; //所在的視窗位置
    enableExchange:boolean = false;
    exchangeTimes:number = 0; //當前兌換次數

    /**
     * 指令的入口
     * @param { string } playerId - 發送指令的玩家ID
     * @param { string[] } args - 指令參數
     * @param { boolean } isfromdiscord - 是否從discord發送指令
     * @returns { string } 錯誤/成功訊息
     */
    async exchange_item(playerId: string, args: string[],isfromdiscord:boolean = false): Promise<string>
    {
        logger.i("進入exchange_item，開始交換物品")
        if(this.exchangeMap.size === 0)
        {
            logger.d("exchangeMap為空，進行初始化")
            this._initExchangeMap()
        }
        if (args.length === 2) {
            logger.d("指令參數為2")
            //如果有開啟自動丟垃圾，就先關閉
            if (settings.enable_discard) 
            {
                logger.d("有開啟丟垃圾")
                discardItemer.stopDiscardItemInterval()
            }
            //取得交換的位置
            this.exchangePosition = args[1];
            //取得要交換的物品資訊
            this.exchangedItem = this.exchangeMap.get(this.exchangePosition);
            //設定變數映射值
            this._setMap()
            //是否能夠取得物品
            if (this.exchangedItem) 
            {
                logger.d(`有找到交換物品，交換物品為:${this.exchangedItem.item.name}`)
                const player = this._findPlayer(playerId);
                if (player) 
                {
                    logger.d(`有找到玩家，玩家名稱為:${player.name!}`)
                    await bot.lookAt(player.position.offset(0, player.height, 0),true);
                    return await this._checkFullInventory(playerId, this.exchangedItem,isfromdiscord);
                } 
                else 
                {
                    logger.d(`沒有找到玩家`)
                    if(!isfromdiscord)
                    {
                       bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_NO_PLAYER_ERROR",this.map)}`); 
                    } 
                    bot.chat(`/tpahere ${playerId}`);
                    return localizer.format("EXCHANGE_NO_PLAYER_ERROR",this.map) as string;
                }
            } 
            else 
            {
                logger.d(`沒有找到交換物品，找尋的位置為:${this.exchangePosition}`)
                if(!isfromdiscord)
                {
                    bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_INVALID_POSITION_ERROR",this.map)}`);
                }
                return localizer.format("EXCHANGE_INVALID_POSITION_ERROR",this.map) as string;
            }
        } 
        else 
        {
            logger.d(`指令參數不為2，值為:${args.length}`)
            if(!isfromdiscord)
            {
                bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_FORMAT_ERROR",this.map)}`);
            }
            return localizer.format("EXCHANGE_FORMAT_ERROR",this.map) as string;
        }
    };

    /**
     * 取消交換
     * @param { string } playerId - 下指令的玩家ID
     * @param { boolean | undefined } isfromdiscord - 是否從discord發送指令
     * @returns { string } 錯誤/成功訊息
     */
    async stopExchange(playerId: string ,isfromdiscord:boolean = false):Promise<string>
    {
        logger.i("進入stopExchangeInterval，取消交換")
        if (this.exchangedItem !== undefined) 
        {
            logger.d("有定義exchangedItem")
            //將兌換取消
            this.enableExchange = false;
            bot.closeWindow(this.currentWindow!);
            await discardItemer.tossItem(this.exchangedItem.item)
            this.exchangeAmount = this._getExchangeAmount(this.exchangedItem!);
            //設定變數映射值
            this._setMap();
            if(!isfromdiscord)
            {
                bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_STOP",this.map)}`);
            }
            //是否有開啟兌換紀錄
            if (settings.enable_exchange_logs) 
            {
                logger.d("有開啟兌換紀錄")
                logger.writeExchangeLog(playerId ?? bot.username, this.exchangedItem.item.name, this.exchangeFrequency);
            }
            //是否有開啟丟垃圾
            if (settings.enable_discard) 
            {
                logger.d("有開啟丟垃圾")
                discardItemer.discardItem();
            }
            this.exchangedItem = undefined;
            return localizer.format("EXCHANGE_STOP",this.map) as string;
        }
        else
        {
            if(!isfromdiscord)
            {
                bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_NOT_EXCHANGE_NOW",this.map)}`);
            }
            return localizer.format("EXCHANGE_NOT_EXCHANGE_NOW",this.map) as string;
        }
    }

    /**
     * 斷線時呼叫，暫停兌換
     */
    errorStop():void
    {
        this.enableExchange = false;
    }

    /**
     * 查詢能夠交換幾次兌換物
     * @param { string | undefined } playerId - 下指令的玩家ID
     * @param { string[] } args - 指令參數
     * @param { boolean } isfromdiscord - 是否從discord發送指令
     * @returns { string } 錯誤/成功訊息
     */
    inquire(playerId: string | undefined, args: string[],isfromdiscord:boolean = false):string
    {
        logger.i("進入inquire，查詢能夠交換幾次兌換物")
        if(this.exchangeMap.size === 0)
        {
            logger.d("exchangeMap為空，進行初始化")
            this._initExchangeMap()
        }
        if (args.length === 2) 
        {
            logger.d("參數數量為2")
            this.exchangePosition = args[1];
            this.exchangedItem = this.exchangeMap.get(this.exchangePosition);
            if (this.exchangedItem) 
            {
                logger.d(`有找到交換物品，交換物品為:${this.exchangedItem.item.name}`)
                if (this.exchangedItem.count !== 0) 
                {
                    logger.d("會產生交換物")
                    this.exchangeAmount = this._getExchangeAmount(this.exchangedItem);
                    this.exchangeSets = Math.floor(this.exchangeAmount * this.exchangedItem.count / 64);
                    this.exchangeQuantity = this.exchangeAmount * this.exchangedItem.count % 64;
                    this._setMap()
                    if(!isfromdiscord)
                    {
                        bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_ITEM_INQUIRE",this.map)}`);
                    }
                } 
                else 
                {
                    logger.d("不會產生交換物")
                    this.exchangeAmount = this._getExchangeAmount(this.exchangedItem);
                    this._setMap()
                    if(!isfromdiscord)
                    {
                      bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_NO_ITEM_INQUIRE",this.map)}`);  
                    }
                    return localizer.format("EXCHANGE_NO_ITEM_INQUIRE",this.map) as string;
                }
            } 
            else 
            {
                logger.d(`沒有找到交換物品，找尋的位置為:${this.exchangePosition}`)
                this._setMap()
                if(!isfromdiscord)
                {
                    bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_INVALID_POSITION_ERROR",this.map)}`);
                }
                return localizer.format("EXCHANGE_INVALID_POSITION_ERROR",this.map) as string
            }
        } 
        else 
        {
            logger.d(`參數數量不為2，參數數量為:${args.length}`)
            this._setMap()
            if(!isfromdiscord)
            {
                bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_INQUIRE_FORMAT_ERROR",this.map)}`);
            }
            return localizer.format("EXCHANGE_INQUIRE_FORMAT_ERROR",this.map) as string
        }
        this.exchangedItem = undefined;
        this.exchangeSets = 0;
        this.exchangeQuantity = 0;
        return localizer.format("EXCHANGE_ITEM_INQUIRE",this.map) as string
    };

    /**
     * 內部函數，兌換
     * 透過setTimeout自身達成循環，並透過this.enableExchange來控制是否退出循環
     * @param { string } playerId - 下指令的玩家ID
     * @param { choicedItem } item - 兌換的物品 
     */
    async _exchange (playerId: string, item: choicedItem): Promise<void> 
    {
        if (bot.inventory.items().length === 36 && item.item.stackSize - (item.count * this.exchangeTimes) <= (item.item.stackSize % item.count) && item.count !== 0) 
        {
            logger.d("已經滿背包，且已達物品堆疊上限且物品有兌換物產生")
            bot.closeWindow(this.currentWindow!);
            this.exchangeTimes = 0;
            await discardItemer.tossItem(item.item).then(async () => {
                this.currentWindow = await get_window(bot, "shop_exp");
            });
        } 
        else if (this._getExchangeAmount(item) === 0) 
        {
            logger.d("已經無法兌換更多物品")
            await this.stopExchange(playerId);
            return;
        }
        //點擊視窗上的位置進行兌換
        await bot.clickWindow(item.slot, 0, 0).then(() => 
        {
            this.exchangeFrequency++;
            logger.i(`已兌換${this.exchangeFrequency}次`)
            if (item.count !== 0) 
            {
                this.exchangeTimes++;
            }
        });
        
        if(this.enableExchange)
        {
            logger.d("繼續兌換")
            setTimeout(()=>{
                this._exchange(playerId,item);
            },(item.count === 0 ? settings.no_item_exchange_interval * 1000 : settings.item_exchange_interval * 1000))
        }
    }

    /**
     * 內部函數，兌換前的檢查
     * @param { string } playerId - 下指令的玩家ID
     * @param { choicedItem } item - 兌換物品
     * @param { boolean } isfromdiscord - 是否從discord發送指令
     * @returns { string } 錯誤/成功訊息 
     */
    async _checkFullInventory (playerId: string, item: choicedItem,isfromdiscord:boolean = false):Promise<string> 
    {   
        logger.i("進入check，進行兌換前的檢查")
        //是否滿背包且會產生兌換物
        if (bot.inventory.items().length === 36 && item.count !== 0) 
        {
            logger.d("滿背包且會產生兌換物")
            if(!isfromdiscord)
            {
                bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_BACKPACK_IS_FULL_ERROR",this.map)}`);
            }
            await discardItemer.tossTotemOfUndying();
            this.exchangedItem = undefined;
            return localizer.format("EXCHANGE_BACKPACK_IS_FULL_ERROR",this.map) as string
        } 
        else 
        {
            logger.d("沒滿背包且不會產生兌換物")
            //初始化兌換次數
            this.exchangeFrequency = 0;
            //初始化當前兌換次數
            this.exchangeTimes = 0;
            if(!isfromdiscord)
            {
                bot.chat(`/m ${playerId} ${localizer.format("EXCHANGE_START",this.map)}`);
            }
            this.currentWindow = await get_window(bot, "shop_exp");
            this.enableExchange = true;
            this._exchange(playerId ,item)
            return localizer.format("EXCHANGE_START",this.map) as string
        }
    };

    /**
     * 內部函數，用於建立兌換座標表
     */
    _initExchangeMap()
    {
        logger.i("進入_initExchangeMap，建立兌換座標表")
        const Item = ItemVersions(bot.version)
        this.exchangeMap.set("A1", new choicedItem(0, new Item(bot.registry.itemsByName["sponge"].id, 1), 5345, 5)); // 海綿
        this.exchangeMap.set("A2", new choicedItem(1, new Item(bot.registry.itemsByName["ink_sac"].id, 1), 5345, 5));   // 墨囊
        this.exchangeMap.set("A3", new choicedItem(2, new Item(bot.registry.itemsByName["barrier"].id, 1), 5345, 16));  // 屏障
        this.exchangeMap.set("A4", new choicedItem(3, new Item(bot.registry.itemsByName["light"].id, 1), 5345, 16));  // 光源
    
        this.exchangeMap.set("B1", new choicedItem(9, new Item(bot.registry.itemsByName["iron_horse_armor"].id, 1), 1395, 1))  //鐵馬鎧
        this.exchangeMap.set("B2", new choicedItem(10, new Item(bot.registry.itemsByName["golden_horse_armor"].id, 1), 12895, 1))  //黃金馬鎧
        this.exchangeMap.set("B3", new choicedItem(11, new Item(bot.registry.itemsByName["diamond_horse_armor"].id, 1), 27395, 1))  //鑽石馬鎧
        //exchangeMap.set("B4", new choicedItem(12, new Item(500, 1), 12895, 1))  //界伏盒*1
        this.exchangeMap.set("B5", new choicedItem(13, new Item(bot.registry.itemsByName["shulker_box"].id, 1), 825280, 64))  //界伏盒*64 500
        this.exchangeMap.set("B6", new choicedItem(14, new Item(bot.registry.itemsByName["dragon_head"].id, 1), 27395, 1))  //龍頭*1
        this.exchangeMap.set("B7", new choicedItem(15, new Item(bot.registry.itemsByName["dragon_egg"].id, 1), 297845, 1))  //龍蛋*1
        this.exchangeMap.set("B8", new choicedItem(16, new Item(bot.registry.itemsByName["name_tag"].id, 1), "20", 1))  //命名牌*1
        this.exchangeMap.set("B9", new choicedItem(17, new Item(bot.registry.itemsByName["slime_ball"].id, 1), "30", 5))  //史萊姆球*5
    
        this.exchangeMap.set("C1", new choicedItem(18, new Item(bot.registry.itemsByName["skeleton_spawn_egg"].id, 1), 30970, 1))  //骷髏重生蛋
        this.exchangeMap.set("C2", new choicedItem(19, new Item(bot.registry.itemsByName["zombie_spawn_egg"].id, 1), 30970, 1))  //殭屍重生蛋
        this.exchangeMap.set("C3", new choicedItem(20, new Item(bot.registry.itemsByName["spider_spawn_egg"].id, 1), 30970, 1))  //蜘蛛重生蛋
        this.exchangeMap.set("C4", new choicedItem(21, new Item(bot.registry.itemsByName["cave_spider_spawn_egg"].id, 1), 30970, 1))  //洞穴蜘蛛重生蛋
        this.exchangeMap.set("C5", new choicedItem(22, new Item(bot.registry.itemsByName["blaze_spawn_egg"].id, 1), 30970, 1))  //烈焰神重生蛋
        this.exchangeMap.set("C6", new choicedItem(23, new Item(bot.registry.itemsByName["guardian_spawn_egg"].id, 1), 550, 1))  //深海守衛重生蛋
        this.exchangeMap.set("C7", new choicedItem(24, new Item(bot.registry.itemsByName["witch_spawn_egg"].id, 1), 30970, 1))  //女巫重生蛋
        this.exchangeMap.set("C9", new choicedItem(26, new Item(bot.registry.itemsByName["spawner"].id, 1), "200", 1))  //生怪專
    
        this.exchangeMap.set("D1", new choicedItem(27, new Item(bot.registry.itemsByName["player_head"].id, 1), 5345, 1)) //頭
        this.exchangeMap.set("D2", new choicedItem(28, new Item(bot.registry.itemsByName["player_head"].id, 1), 342080, 64)) //頭*64
    
        this.exchangeMap.set("E1", new choicedItem(36, new Item(bot.registry.itemsByName["villager_spawn_egg"].id, 1), 12895, 0)) //村民召喚
        this.exchangeMap.set("E2", new choicedItem(37, new Item(bot.registry.itemsByName["llama_spawn_egg"].id, 1), 2920, 0)) //羊駝召喚
        this.exchangeMap.set("E3", new choicedItem(38, new Item(bot.registry.itemsByName["mooshroom_spawn_egg"].id, 1), 2920, 0)) //哞菇召喚
        this.exchangeMap.set("E4", new choicedItem(39, new Item(bot.registry.itemsByName["ocelot_spawn_egg"].id, 1), 1395, 0)) //山貓召喚
        this.exchangeMap.set("E5", new choicedItem(40, new Item(bot.registry.itemsByName["wolf_spawn_egg"].id, 1), 1395, 0)) //野狼召喚
        this.exchangeMap.set("E6", new choicedItem(41, new Item(bot.registry.itemsByName["polar_bear_spawn_egg"].id, 1), 2920, 0)) //北極熊召喚
        this.exchangeMap.set("E7", new choicedItem(42, new Item(bot.registry.itemsByName["squid_spawn_egg"].id, 1), 160, 0)) //墨魚召喚
        this.exchangeMap.set("E8", new choicedItem(43, new Item(bot.registry.itemsByName["guardian_spawn_egg"].id, 1), 160, 0)) //深海守衛召喚
        this.exchangeMap.set("E9", new choicedItem(44, new Item(bot.registry.itemsByName["elder_guardian_spawn_egg"].id, 1), 12895, 0)) //遠古深海守衛召喚
    
        this.exchangeMap.set("F1", new choicedItem(48, new Item(bot.registry.itemsByName["dolphin_spawn_egg"].id, 1), 2920, 0)) //海豚召喚
        this.exchangeMap.set("F2", new choicedItem(49, new Item(bot.registry.itemsByName["parrot_spawn_egg"].id, 1), 2920, 0)) //鸚鵡召喚
        this.exchangeMap.set("F3", new choicedItem(50, new Item(bot.registry.itemsByName["allay_spawn_egg"].id, 1), 2920, 0)) //悅靈
    }

    /**
     * 內部函數，建立變數的映射值
     */
    _setMap() 
    {
        logger.i("設定變數的映射值")
        this.map.set("exchangePosition", this.exchangePosition);
        this.map.set("frequency", formatThousandths(this.exchangeFrequency));
        this.map.set("amount", formatThousandths(this.exchangeAmount));
        this.map.set("item", this.exchangedItem ? this.exchangedItem.item.name : "");
        this.map.set("set", formatThousandths(this.exchangeSets));
        this.map.set("quantity", this.exchangeQuantity.toString());
    }

    /**
     * 內部函數，取得可兌換的次數
     * @param { choicedItem } item - 兌換物品 
     * @returns { number } 可兌換的次數
     */
    _getExchangeAmount(item:choicedItem):number 
    {
        logger.i("進入_getExchangeAmount，取得可兌換物品數量")
        //有bug 目前level顯示經驗值 points顯示等級 所以暫時先對調
        if (typeof item.exp === "string") 
        {
            logger.d("型態為字串")
            return Math.floor(bot.experience.points / parseInt(item.exp))
        } 
        else 
        {
            logger.d("型態為數字")
            return Math.floor(bot.experience.level / item.exp) 
        }
    }

    /**
     * 內部函數，確認附近有沒有發送指令的玩家 
     * @param { string } playerId  - 發送指令的玩家ID
     * @returns { Entity | undefined } 玩家實例
     */
    _findPlayer(playerId:string): Entity | undefined 
    {
        logger.i(`進入_findPlayer，找尋下指令的玩家`)
        for (const entity in bot.entities) 
        {
            if (bot.entities[entity].type === 'player' && bot.entities[entity].username === playerId && bot.entity.position.distanceTo(bot.entities[entity].position) <= 10) 
            {
                logger.d("已找到玩家")
                return bot.entities[entity]
            }
        }
        logger.d("未找到玩家")
        return undefined
    }

    constructor()
    {
        logger.i("建立ExchangeController物件")
    }
}

export default function setExchangeManager()
{
    logger.i("進入setExchangeManager，建立一個新的ExchangeController物件")
    exchangeManager = new ExchangeController()
}