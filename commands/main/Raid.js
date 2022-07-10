let no_mob = true
let raid = true
let username = ""
let map = new Map()
module.exports = function (discord, local, settings) {
    const mob_list = (settings.mob_list)
    initMap()
    this.hit = function (bot) {
        username = bot.username
        let count = 0
        bot.on('physicsTick',async function r(){
            if(!raid)
            {
                bot.removeListener('physicsTick',r)
                raid=true
            }
            count++
            if(count === settings.Interval_ticks)
            {
                no_mob = true
                for (let mobentity in bot.entities) {

                    if (bot.entity.position.distanceTo(bot.entities[mobentity].position) <= settings.attack_radius && mob_list.includes(bot.entities[mobentity].name)) //攻擊距離最大 = 6
                    {
                        await bot.attack(bot.entities[mobentity], false)
                        if (no_mob) {
                            no_mob = false
                        }
                    }

                }
                count = 0
            }
        })
    }

    this.detect_interruption = function (bot) {
        let exp = 0
        this.no_raid_interval = setInterval(async () => {
            if (no_mob && exp === bot.experience.points) {
                if (settings.enable_discord_bot) {
                    discord.send(get_content("DETECT_INTERRUPT_MSG_DC_PREFIX"), get_content("DETECT_INTERRUPT_MSG_DC_STEM"))
                }
                bot.chat(`/m ${settings.forward_ID} ${get_content("DETECT_INTERRUPT_MSG_GAME_STEM")}`)
            }
            exp = bot.experience.points
        }, settings.check_raid_cycleTime)
    }

    this.down = function () {
        raid = false
        if(settings.enable_detect_interrupt)
        {
            clearInterval(this.no_raid_interval)
        }
    }

    function get_content(path) {
        return local.get_content(path, map, username)
    }

    this.equipped = function (bot) {
        for (let item of bot.inventory.items()) {
            if (item.name.endsWith("sword")) {
                setTimeout(()=>{
                    bot.equip(item, "hand").then(()=>{
                        console.log(`Equipped ${item.name}`)
                    })
                },500)
                continue
            }
            if (item.name.endsWith("helmet")){
                setTimeout(()=>{
                    bot.equip(item, "head").then(()=>{
                        console.log(`Equipped ${item.name}`)
                    })
                },1000)
                continue
            }
            if (item.name.endsWith("chestplate") || item.name.endsWith("elytra")){
                setTimeout(()=>{
                    bot.equip(item, "torso").then(()=>{
                        console.log(`Equipped ${item.name}`)
                    })
                },1500)
                continue
            }
            if (item.name.endsWith("leggings")){
                setTimeout(()=>{
                    bot.equip(item, "legs").then(()=>{
                        console.log(`Equipped ${item.name}`)
                    })
                },2000)
                continue
            }
            if (item.name.endsWith("boots")){
                setTimeout(()=>{
                    bot.equip(item, "feet").then(()=>{
                        console.log(`Equipped ${item.name}`)
                    })
                },2500)
            }
        }
    }

    this.unequipped = function (bot) {
        setTimeout(()=>{
            bot.unequip("hand").then(()=>{
                console.log(`Unequipped hand item`)
            })
        },500)
        setTimeout(()=>{
            bot.unequip("head").then(()=>{
                console.log(`Unequipped head item`)
            })
        },1000)
        setTimeout(()=>{
            bot.unequip("torso").then(()=>{
                console.log(`Unequipped torso item`)
            })
        },1500)
        setTimeout(()=>{
            bot.unequip("legs").then(()=>{
                console.log(`Unequipped legs item`)
            })
        },2000)
        setTimeout(()=>{
            bot.unequip("feet").then(()=>{
                console.log(`Unequipped feet item`)
            })
        },2500)
    }
    return this
}

function initMap() {
    map.set("0", "username")
}

