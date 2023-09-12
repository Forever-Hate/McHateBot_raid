import { Bot } from "mineflayer";

import { Setting } from "../../models/files";
import { RaidInterface } from "../../models/modules";
import { localizer } from "../../utils/localization";
import { logger } from "../../utils/logger";
import { DiscordManager } from "../communicate/dc";


export class RaidController implements RaidInterface
{
    discord:DiscordManager;
    settings: Setting;
    mob_list: string[];
    isNoMob: boolean = true;
    enableRaid: boolean = true;
    username: string = "";
    map: Map<string, string> = new Map<string, string>();
    noRaidInterval: NodeJS.Timeout | null = null;
    
    /**
     * 註冊physicsTick，開始打怪
     * @param { Bot } bot - bot實例
     */
    raid(bot: Bot):void
    {
        logger.i(`進入raid，註冊physicsTick開始打怪`)
        //註冊bot名稱
        this.username = bot.username; 
        let count:number = 0;
        //初始化變數映射值
        this._initMap();
        //建立RaidController映射
        const self = this;
        this.enableRaid = true;
        bot.on('physicsTick', async function r() 
            {
                //是否需要中斷打怪
                if (!self.enableRaid) 
                {
                    bot.removeListener('physicsTick', r);
                    self.enableRaid = true;
                }
                count++;
                //超過指定的ticks數才會開始打怪
                if (count === self.settings.Interval_ticks) 
                {
                    self.isNoMob = true;
                    for (const mobentity in bot.entities) 
                    {
                        if (bot.entity.position.distanceTo(bot.entities[mobentity].position) <= self.settings.attack_radius) //攻擊距離最大 = 6
                        {
                            if (bot.entities[mobentity].name ?? undefined) //確認是否為空值
                            {
                                if (self.mob_list.includes(bot.entities[mobentity].name!)) //確認是否在目標清單內
                                {
                                    bot.attack(bot.entities[mobentity]); //攻擊
                                    //確認是否有沒有目標怪物
                                    if (self.isNoMob) 
                                    {
                                        self.isNoMob = false;
                                    }
                                }
                            } 
                        }
                    }
                    count = 0;
                }
            }
        )
    };

    /**
     * 建立計時器，偵測突襲是否中斷
     * @param { Bot } bot - bot實例
     */
    detectInterruption(bot: Bot):void
    {
        logger.i(`進入detectInterruption，設定偵測突襲中斷的Interval`)
        let exp: number = 0;
        this.noRaidInterval = setInterval(async () => {
            if (this.isNoMob && exp === bot.experience.points) 
            {
                logger.d("沒有怪且無獲得經驗")
                if (this.settings.enable_discord_bot) 
                {
                    logger.d("有開啟discord bot")
                    this.discord.send("", `${localizer.format("DETECT_INTERRUPT_MSG_DC_PREFIX", this.map)}: ${localizer.format("DETECT_INTERRUPT_MSG_DC_STEM", this.map)}`);
                }
                if(this.settings.enable_reply_msg)
                {
                    logger.d("有開啟回覆訊息")
                    bot.chat(`/m ${this.settings.forward_ID} ${localizer.format("DETECT_INTERRUPT_MSG_GAME_STEM", this.map)}`);
                }
            }
            exp = bot.experience.points;
        }, this.settings.check_raid_cycleTime * 1000);
    };

    /**
     * 暫停突襲計時器，並取消監聽器physicsTick(打怪)
     */
    raidDown():void
    {
        logger.i(`進入raidDown，關閉打怪`)
        this.enableRaid = false;
        if (this.settings.enable_detect_interrupt) 
        {
            if(this.noRaidInterval)
            {
               clearInterval(this.noRaidInterval); 
            }
        }
    };

    /**
     * 穿上裝備(包含手上物品、頭、胸、腿、靴)
     * 手上會主動尋找劍，如果沒有就不會裝備
     * @param { Bot } bot - bot實例
     */
    equipped(bot: Bot):void
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
     * @param { Bot } bot - bot實例
     */
    unequipped(bot: Bot):void
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

    constructor(discord:DiscordManager,settings: Setting)
    {
        logger.i("建立RaidController物件")
        this.discord = discord;
        this.settings = settings;
        this.mob_list = settings.mob_list
    }
    
}
