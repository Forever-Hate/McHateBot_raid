let no_mob = true
let username = ""
let map = new Map()
module.exports = function (discord, local, settings) {
    const mob_list = (settings.mob_list)
    initMap()
    this.hit = function (bot) {
        username = bot.username
        this.attackInterval = setInterval(async () => {
            no_mob = true
            for (let mobentity in bot.entities) {

                if (bot.entity.position.distanceTo(bot.entities[mobentity].position) <= 6 && mob_list.includes(bot.entities[mobentity].name)) //攻擊距離最大 = 6
                {
                    await bot.attack(bot.entities[mobentity], false)
                    if (no_mob) {
                        no_mob = false
                    }
                }

            }
        }, settings.Interval)
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
        clearInterval(this.attackInterval)
        clearInterval(this.no_raid_interval)
    }

    function get_content(path) {
        return local.get_content(path, map, username)
    }

    this.sword = function (bot) {
        for (let item of bot.inventory.items()) {
            if (item.name.endsWith("sword")) {
                bot.equip(item, "hand")
                break
            }
        }
    }

    return this
}

function initMap() {
    map.set("0", "username")
}

