import { RaidInterface } from "../../models/modules";
import { localizer } from "../../utils/localization";
import { logger } from "../../utils/logger";
import { bot } from "./bot";
import { discordManager } from "../communicate/dc";
import { settings } from "../../utils/util";

export let raid:RaidController;

export class RaidController implements RaidInterface
{
    mob_list: string[];
    isNoMob: boolean = true;
    username: string = "";
    map: Map<string, string> = new Map<string, string>();
    noRaidInterval: NodeJS.Timeout | null = null;
    
    /**
     * 註冊physicsTick，開始打怪
     */
    raid():void
    {
        logger.i(`進入raid，註冊physicsTick開始打怪`)
        //註冊bot名稱
        this.username = bot.username; 
        let count:number = 0;
        //初始化變數映射值
        this._initMap();
        bot.on('physicsTick', async () => {
            count++;
            //超過指定的ticks數才會開始打怪
            if (count === settings.interval_ticks) 
            {
                this.isNoMob = true;
                for (const mobentity in bot.entities) 
                {
                    if (bot.entity.position.distanceTo(bot.entities[mobentity].position) <= settings.attack_radius) //攻擊距離最大 = 6
                    {
                        if (bot.entities[mobentity].name ?? undefined) //確認是否為空值
                        {
                            if (this.mob_list.includes(bot.entities[mobentity].name!)) //確認是否在目標清單內
                            {
                                bot.attack(bot.entities[mobentity],false); //攻擊
                                //確認是否有沒有目標怪物
                                if (this.isNoMob) 
                                {
                                    this.isNoMob = false;
                                }
                            }
                        } 
                    }
                }
                count = 0;
            }
        })
    };

    /**
     * 建立計時器，偵測突襲是否中斷
     */
    detectInterruption():void
    {
        logger.i(`進入detectInterruption，設定偵測突襲中斷的Interval`)
        let exp: number = 0;
        this.noRaidInterval = setInterval(async () => {
            if (this.isNoMob && exp === bot.experience.points) 
            {
                logger.d("沒有怪且無獲得經驗")
                if (settings.enable_discord_bot) 
                {
                    logger.d("有開啟discord bot")
                    discordManager.send("", `${localizer.format("DETECT_INTERRUPT_MSG_DC_PREFIX", this.map)}: ${localizer.format("DETECT_INTERRUPT_MSG_DC_STEM", this.map)}`);
                }
                if(settings.enable_reply_msg)
                {
                    logger.d("有開啟回覆訊息")
                    bot.chat(`/m ${settings.forward_ID} ${localizer.format("DETECT_INTERRUPT_MSG_GAME_STEM", this.map)}`);
                }
            }
            exp = bot.experience.points;
        }, settings.check_raid_interval * 1000);
    };

    /**
     * 停止偵測突襲的計時器
     */
    raidDown():void
    {
        logger.i(`進入raidDown，停止偵測突襲的計時器`)
        if(this.noRaidInterval)
        {
            clearInterval(this.noRaidInterval); 
        }
    };

    /**
     * 重新更新noRaidInterval
    */
    reloadRaid()
    {
        logger.i("進入reloadRaid，重新更新noRaidInterval")
        if(this.noRaidInterval)
        {
            clearInterval(this.noRaidInterval); 
        }
        this.detectInterruption()
    }

    /**
     * 穿上裝備(包含手上物品、頭、胸、腿、靴)
     * 
     * 會主動尋找劍，如果沒有就不會裝備
     */
    equipped():void
    {
        logger.i(`進入equipped，穿上裝備`)
        for (const item of bot.inventory.items()) 
        {
            if (item.name.endsWith("sword")) 
            {
                setTimeout(() => {
                    bot.equip(item, "hand").then(() => {
                        console.log(`Equipped ${item.name}`);
                    });
                }, 500);
                continue;
            }
            if (item.name.endsWith("helmet")) 
            {
                setTimeout(() => {
                    bot.equip(item, "head").then(() => {
                        console.log(`Equipped ${item.name}`);
                    });
                }, 1000);
                continue;
            }
            if (item.name.endsWith("chestplate") || item.name.endsWith("elytra")) 
            {
                setTimeout(() => {
                    bot.equip(item, "torso").then(() => {
                        console.log(`Equipped ${item.name}`);
                    });
                }, 1500);
                continue;
            }
            if (item.name.endsWith("leggings")) 
            {
                setTimeout(() => {
                    bot.equip(item, "legs").then(() => {
                        console.log(`Equipped ${item.name}`);
                    });
                }, 2000);
                continue;
            }
            if (item.name.endsWith("boots")) 
            {
                setTimeout(() => {
                    bot.equip(item, "feet").then(() => {
                        console.log(`Equipped ${item.name}`);
                    });
                }, 2500);
            }
        }
    };

    /**
     * 卸下裝備(包含手上物品、頭、胸、腿、靴)
     */
    unequipped():void
    {
        logger.i(`進入uneuipped，卸下裝備`)
        setTimeout(() => {
            //脫下手上的物品
            bot.unequip("hand").then(() => {
                logger.l(`Unequipped hand item`);
            });
        }, 500);
        setTimeout(() => {
            //脫下頭盔
            bot.unequip("head").then(() => {
                logger.l(`Unequipped head item`);
            });
        }, 1000);
        setTimeout(() => {
            //脫下胸甲
            bot.unequip("torso").then(() => {
                logger.l(`Unequipped torso item`);
            });
        }, 1500);
        setTimeout(() => {
            //脫下褲子
            bot.unequip("legs").then(() => {
                logger.l(`Unequipped legs item`);
            });
        }, 2000);
        setTimeout(() => {
            //脫下鞋子
            bot.unequip("feet").then(() => {
                logger.l(`Unequipped feet item`);
            });
        }, 2500);
    };

    /**
     * 內部函數，初始化變數的映射值
    */
    _initMap() 
    {
        logger.i("設定映射值")
        this.map.set("username", this.username);
    }

    constructor()
    {
        logger.i("建立RaidController物件")
        this.mob_list = settings.mob_list
    }
    
}

export default function setRaid()
{
    logger.i("進入setRaid，建立一個新的RaidController物件")
    raid = new RaidController();
}
