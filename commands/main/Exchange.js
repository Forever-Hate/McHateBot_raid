let exchange_map = new Map()
let map = new Map()
let exchange_frequency = 0
let exchange_amount = 0
let exchanged_item = undefined
let exchange_sets = 0
let exchange_quantity = 0
let current_window
let position
const Item = require("prismarine-item")('1.18.2')
module.exports = function (local, discard, settings, log) {
    initMap()
    this.exchange_item = async function (bot, playerid, args) {
        if (args.length === 2) {
            if(settings.enable_discard)
            {
                discard.d()
            }
            position = args[1]
            exchanged_item = exchange_map.get(position)
            if (exchanged_item) {
                let player = findPlayer(bot, playerid)
                if (player) {
                    await bot.lookAt(player.position.offset(0, player.height, 0))
                    await this.exchange(bot, playerid, exchanged_item)
                } else {
                    bot.chat(`/m ${playerid}  ${await get_content("EXCHANGE_NO_PLAYER_ERROR")}`)
                    bot.chat(`/tpahere ${playerid}`)
                    exchanged_item = undefined
                }
            } else {
                bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_INVALID_POSITION_ERROR")}`)
                exchanged_item = undefined
            }
        } else {
            bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_FORMAT_ERROR")}`)
        }

    }
    this.stop = async function (bot, playerid) {
        if (exchanged_item !== undefined) {
            clearInterval(this.exchangeInterval)
            bot.closeWindow(current_window)
            await tossItem(bot, exchanged_item.i).then(async () => {
                exchange_amount = get_exchange_amount(bot, exchanged_item)
                bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_STOP")}`)
            })
            if (settings.enable_exchange_logs) {
                log.writeExchangeLog(playerid, exchanged_item.i.name, exchange_frequency)
            }
            if(settings.enable_discard)
            {
                discard.discarditem(bot)
            }
        }
        exchanged_item = undefined


    }
    this.exchange = async function (bot, playerid, Item) {
        if (bot.inventory.items().length === 36 && Item.count !== 0) //背包滿且交換有物品
        {
            bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_BACKPACK_IS_FULL_ERROR")}`)
            await discard.abc(bot)
            exchanged_item = undefined
        }
        else //背包未滿且交換有/無物品
        {
            exchange_frequency = 0
            let times = 0
            bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_START")}`)
            current_window = await get_window(bot, "shop_exp")
            this.exchangeInterval = setInterval(async () => {
                if (bot.inventory.items().length === 36 && Item.i.stackSize - (Item.count * times) <= (Item.i.stackSize % Item.count) && Item.count !== 0) //背包滿且無法進行下一次交換
                {
                    //丟出物品
                    bot.closeWindow(current_window)
                    times = 0
                    await tossItem(bot, Item.i).then(async () => {
                        current_window = await get_window(bot, "shop_exp")
                    })
                } else if (get_exchange_amount(bot, Item) === 0) {
                    await this.stop(bot, playerid)
                }
                await bot.clickWindow(Item.slot,0,0).then(()=>{
                    exchange_frequency++
                    if(Item.count !== 0)
                    {
                        times++
                    }
                })
            }, Item.count === 0 ? settings.no_item_exchange_interval : settings.item_exchange_interval)
        }

    }
    this.error_stop = function () {
        clearInterval(this.exchangeInterval)
    }

    this.inquire = async function (bot,playerid,args)
    {
        if (args.length === 2) {
            position = args[1]
            exchanged_item = exchange_map.get(position)
            if (exchanged_item) {
                if(exchanged_item.count !== 0)
                {
                    exchange_amount = get_exchange_amount(bot, exchanged_item)
                    exchange_sets = Math.floor(exchange_amount * exchanged_item.count / 64)
                    exchange_quantity = exchange_amount * exchanged_item.count % 64
                    bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_ITEM_INQUIRE")}`)
                }
                else
                {
                    exchange_amount = get_exchange_amount(bot, exchanged_item)
                    bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_NO_ITEM_INQUIRE")}`)
                }
            } else {
                bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_INVALID_POSITION_ERROR")}`)
            }
            exchanged_item = undefined
            exchange_sets = 0
            exchange_quantity = 0
        } else {
            bot.chat(`/m ${playerid} ${await get_content("EXCHANGE_INQUIRE_FORMAT_ERROR")}`)
        }
    }
    async function get_content(path) {
        return local.get_content(path, map, position, formatThousandths(exchange_frequency), formatThousandths(exchange_amount), exchanged_item ? exchanged_item.i.name : ""
        ,formatThousandths(exchange_sets),exchange_quantity)
    }

    function formatThousandths(number){
        let comma=/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g
        return number.toString().replace(comma, ',')
    }
    return this
}

class choiced_Item {
    constructor(slot, i, exp, count) {
        this.slot = slot
        this.i = i
        this.exp = exp
        this.count = count
    }
}


function initMap() {
    exchange_map.set("A1", new choiced_Item(0, new Item(141, 1), 5345, 5))   //海綿
    exchange_map.set("A2", new choiced_Item(1, new Item(807, 1), 5345, 5))   //墨囊
    exchange_map.set("A3", new choiced_Item(2, new Item(370, 1), 5345, 16))  //屏障
    exchange_map.set("A4", new choiced_Item(3, new Item(371, 1), 5345, 16))  //光源

    exchange_map.set("B1", new choiced_Item(9, new Item(973, 1), 1395, 1))  //鐵馬鎧
    exchange_map.set("B2", new choiced_Item(10, new Item(974, 1), 12895, 1))  //黃金馬鎧
    exchange_map.set("B3", new choiced_Item(11, new Item(975, 1), 27395, 1))  //鑽石馬鎧
    //exchange_map.set("B4", new choiced_Item(12, new Item(451, 1), 12895, 1))  //界伏盒*1
    exchange_map.set("B5", new choiced_Item(13, new Item(451, 1), 825280, 64))  //界伏盒*64
    exchange_map.set("B6", new choiced_Item(14, new Item(958, 1), 27395, 1))  //龍頭*1
    exchange_map.set("B7", new choiced_Item(15, new Item(314, 1), 297845, 1))  //龍蛋*1
    exchange_map.set("B8", new choiced_Item(16, new Item(978, 1), "20", 1))  //命名牌*1
    exchange_map.set("B9", new choiced_Item(17, new Item(793, 1), "30", 5))  //史萊姆球*5

    exchange_map.set("C1", new choiced_Item(18, new Item(918, 1), 30970, 1))  //骷髏重生蛋
    exchange_map.set("C2", new choiced_Item(19, new Item(936, 1), 30970, 1))  //殭屍重生蛋
    exchange_map.set("C3", new choiced_Item(20, new Item(921, 1), 30970, 1))  //蜘蛛重生蛋
    exchange_map.set("C4", new choiced_Item(21, new Item(878, 1), 30970, 1))  //洞穴蜘蛛重生蛋
    exchange_map.set("C5", new choiced_Item(22, new Item(876, 1), 30970, 1))  //烈焰神重生蛋
    exchange_map.set("C6", new choiced_Item(23, new Item(894, 1), 550, 1))  //深海守衛重生蛋
    exchange_map.set("C7", new choiced_Item(24, new Item(932, 1), 297845, 1))  //女巫重生蛋
    exchange_map.set("C9", new choiced_Item(26, new Item(243, 1), "200", 1))  //生怪專

    exchange_map.set("D1", new choiced_Item(27, new Item(955, 1), 5345, 1)) //頭

    exchange_map.set("E1", new choiced_Item(36, new Item(929, 1), 12895, 0)) //村民召喚
    exchange_map.set("E2", new choiced_Item(37, new Item(898, 1), 2920, 0)) //羊駝召喚
    exchange_map.set("E3", new choiced_Item(38, new Item(900, 1), 2920, 0)) //哞菇召喚
    exchange_map.set("E4", new choiced_Item(39, new Item(902, 1), 1395, 0)) //山貓召喚
    exchange_map.set("E5", new choiced_Item(40, new Item(934, 1), 1395, 0)) //野狼召喚
    exchange_map.set("E6", new choiced_Item(41, new Item(910, 1), 2920, 0)) //北極熊召喚
    exchange_map.set("E7", new choiced_Item(42, new Item(922, 1), 160, 0)) //墨魚召喚
    exchange_map.set("E8", new choiced_Item(43, new Item(894, 1), 160, 0)) //深海守衛召喚
    exchange_map.set("E9", new choiced_Item(44, new Item(886, 1), 12895, 0)) //遠古深海守衛召喚

    exchange_map.set("F4", new choiced_Item(48, new Item(883, 1), 2920, 0)) //海豚召喚
    exchange_map.set("F5", new choiced_Item(49, new Item(904, 1), 2920, 0)) //鸚鵡召喚
    exchange_map.set("F6", new choiced_Item(50, new Item(930, 1), 12895, 0)) //一隊刌民召喚

    map.set("0", "coordinate")
    map.set("1", "frequency")
    map.set("2", "amount")
    map.set("3", "item")
    map.set("4","set")
    map.set("5","quantity")
}

function get_window(bot, category) {
    return new Promise((resolve => {
        bot.chat(`/${category}`)
        bot.once("windowOpen", function o(window) {
            resolve(window)
        })
    }))
}

async function tossItem(bot, item) {
    for (let i of bot.inventory.items()) {
        if (i.name === item.name) {
            await bot.tossStack(i).catch((err) => {
                if (err) {
                    console.log("錯誤:" + err)
                }
            })
        }
    }
}

function get_exchange_amount(bot, item) {
    if (typeof item.exp === "string") {
        return Math.floor(bot.experience.level / parseInt(item.exp))
    } else {
        return Math.floor(bot.experience.points / item.exp)
    }
}

function findPlayer(bot, player) {
    for (let entity in bot.entities) {
        if (bot.entities[entity].type === 'player' && bot.entities[entity].username === player && bot.entity.position.distanceTo(bot.entities[entity].position) <= 10) {
            return bot.entities[entity]
        }
    }
    return undefined
}