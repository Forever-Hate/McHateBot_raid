import { Block } from "prismarine-block";

import { bot } from './bot';
import { discordManager } from '../communicate/dc';
import { DiscardItemInterface } from '../../models/modules';
import { get_window, Item, settings } from '../../utils/util';
import { logger } from '../../utils/logger';
import { localizer } from '../../utils/localization';

export let discardItemer:DiscardItemer;

export class DiscardItemer implements DiscardItemInterface
{
  discardItemInterval: NodeJS.Timeout | null = null;
  /**
   * 丟棄設定檔裡設定值以外的物品
  */
  discardItem():void
  {
    logger.i("進入discardItem，建立丟垃圾的計時器")
    //建立一個計時器
    this.discardItemInterval = setInterval(async () => {
      const checkTotemHasSet = await this._checkTotemHasSet();
      let stacked:boolean = false;
      let numOfEmerald:number = 0;
      if (settings.enable_discard_msg) 
      {
        logger.d("已開啟丟垃圾訊息")
        logger.l(localizer.format("DISCARD_MSG") as string)
      }
      for (const item of bot.inventory.items()) 
      {
        if (item !== null) 
        {
          if (!settings.stayItem_list.includes(item.name)) 
          {
            logger.d(`${item.name} 不包含在不要丟掉的清單內`)
            if(settings.enable_stay_totem)
            {
              logger.d("有開啟保留圖騰")
              if (item.name === "totem_of_undying")
              {
                if(checkTotemHasSet)
                {
                  logger.d(`已經超過一組圖騰`)
                  if (item.count !== 64)
                  {
                    logger.d(`丟棄不是一組的圖騰，數量為: ${item.count} 個`)
                    await bot.tossStack(item).catch((err: Error) => {
                      if (err) {
                        console.log("error:" + err);
                      }
                    });
                  }
                }
                else
                {
                  logger.d(`尚未超過一組圖騰`)
                  if(settings.enable_auto_stack_totem)
                  {
                    logger.d(`有開啟自動堆疊圖騰`)
                    if(!stacked)
                    {
                      logger.d(`尚未疊加圖騰`)
                      await this._stackTotem()
                      stacked = true;
                    }
                    else
                    {
                      logger.d(`已疊加圖騰`)
                    }
                  }
                }
                continue;
              }
            }
            
            await bot.tossStack(item).catch((err: Error) => {
              if (err) {
                console.log("error:" + err);
              }
            });
          }
          if (item.name === "emerald")
          {
            numOfEmerald = numOfEmerald + item.count
          }
        }
      }
      logger.d(`已獲得綠寶石總數為: ${numOfEmerald}個`)
      if (numOfEmerald >= 1728)
      {
        logger.d(`已獲得指定數量的綠寶石，數量為: ${numOfEmerald}個，存入銀行`)
        await this._saveEmerald();
      }
    }, settings.discard_interval * 1000);
  }
  /**
   * 重新更新discardItemInterval
  */
  reloadDiscardItem():void
  {
    if(this.discardItemInterval)
    {
      clearInterval(this.discardItemInterval)
    }
    this.discardItem()
  }
  /**
   * 停止丟棄物品的Interval
  */
  stopDiscardItemInterval():void
  {
    logger.i("進入stopDiscardItemInterval，停止Interval")
    if (this.discardItemInterval !== null) 
    {
      logger.d("Interval不為空")
      clearInterval(this.discardItemInterval);
    }
  }
  /**
   * 丟棄bot身上一格圖騰
  */
  async tossTotemOfUndying():Promise<void>
  {
    logger.i("進入tossTotemOfUndying，丟棄身上一格圖騰")
    for (const item of bot.inventory.items()) 
    {
      if (item.name === "totem_of_undying" && item.count === 1) 
      {
        logger.d(`${item.name} 名稱等於totem_of_undying`)
        await bot.tossStack(item);
        break;
      }
    }
  }

  async _saveEmerald():Promise<void>
  {
    logger.i("進入_saveEmerald，儲存綠寶石")
    return new Promise(async (resolve) => {
      get_window(bot,"bank").then((window)=>{
        bot.simpleClick.leftMouse(30).then(()=>{
          bot.closeWindow(window)
          resolve();
        })
      }).catch(()=>{
        logger.d("儲存綠寶石失敗，請稍後再試")
        resolve();
      })
    })
  }

  /**
   * 內部函數，疊加圖騰
   */
  _stackTotem():Promise<void>
  {
    return new Promise(async resolve => {
      logger.i("進入_stackTotem，疊加圖騰")
      const botYaw = bot.entity.yaw;
      const botPitch = bot.entity.pitch;
      bot.setControlState("sneak",true)
      const block:Block = bot.blockAt(bot.entity.position.offset(0,-1,0))!
      logger.d(`腳下的方塊為: ${block.displayName}`)
      await bot.equip(bot.inventory.items().find(i => i.name === "totem_of_undying") as typeof Item,"hand").then(()=>{
          setTimeout(()=>{
              bot.stopDigging();
          },1500)
          bot.dig(block,false).catch(async() => {
              await bot.equip(bot.inventory.items().find(i => i.name.endsWith("sword")) as typeof Item,"hand").catch(()=>{
                logger.d(`沒有找到劍`);
              })
              await bot.look(botYaw,botPitch,true);
              bot.setControlState("sneak",false)
              resolve();
          })
      })
    })
  }
  /**
   * 內部函數，檢查圖騰是否有一組
   * @returns { Promise<boolean> }
   */
  async _checkTotemHasSet():Promise<boolean>
  {
    logger.i("進入_checkTotemHasSet，檢查身上是否有一組圖騰")
    return new Promise(resolve => {
      let totemHasSet = false;
      let numOfTotem = 0;
      for (const item of bot.inventory.items()) 
      {
        if (item.name === "totem_of_undying") 
        {
          numOfTotem += item.count;
          if(item.count === 64)
          {
            totemHasSet = true;
          }
        }
      }
      if(settings.enable_totem_notifier)
      {
        logger.d("有開啟圖騰數量提醒")
        if(numOfTotem < 5 && numOfTotem > 0)
        {
          logger.d("圖騰數量低於5個")
          if(settings.enable_reply_msg)
          {
            logger.d("有開啟回覆訊息，提醒")
            bot.chat(`/m ${settings.forward_ID} ${localizer.format("TOTEM_NOT_ENOUGH_ERROR") as string}`)
            if(settings.enable_discord_bot)
            {
              logger.d("有開啟discord bot，提醒")
              discordManager.send(bot.username,localizer.format("TOTEM_NOT_ENOUGH_ERROR") as string)
            }
          }
        }
      }
      
      resolve(totemHasSet)
    })
  }
  
  /**
   * 丟棄bot身上所有的物品(不包含身上穿的盔甲)
  */
  async discardAllItems():Promise<void>
  {
    logger.i("進入discardAllItems，丟棄身上所有的物品(不包含身上穿的盔甲)")
    for (const item of bot.inventory.items()) 
    {
      await bot.tossStack(item);
    }
  }

  /**
   * 丟棄bot身上指定的物品
   * @param { typeof Item } item - 指定丟棄的物品
   */
  async tossItem(item: typeof Item):Promise<void>
  {
    logger.i("進入tossItem，丟棄身上指定的物品")
    for (const i of bot.inventory.items()) 
    {
        if (i.name === item.name) 
        {
          logger.d(`${item.name} 名稱等於 ${i.name}`)
          await bot.tossStack(i).catch((err) => {
            if (err) {
                logger.e("錯誤:" + err)
            }
          })
        }
    }
  }

  constructor()
  {
    logger.i("建立DiscardItemer物件")
  }
  
}

export default function setDiscardItemer()
{
  logger.i("進入setDiscardItemer，建立一個新的DiscardItemer物件")
  discardItemer = new DiscardItemer();
}