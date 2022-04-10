module.exports = function (local, settings) {
    this.discarditem = (bot) => {
        this.discardItemInterval = setInterval(async () => {
            if (settings.enable_discard_msg) {
                console.log(`${local.get_content("DISCARD_MSG")}`)
            }
            for (let item of bot.inventory.items()) {
                if (item !== null) {
                    if (!(settings.stayItem_list.includes(item.name))) {
                        await bot.tossStack(item).catch((err) => {
                            if (err) {
                                console.log("error:" + err)
                            }
                        })
                    }
                }
            }
        }, settings.discarditem_cycleTime)
    }
    this.d = function () {
        clearInterval(this.discardItemInterval)
    }
    this.abc = async function (bot) {
        for (let item of bot.inventory.items()) {
            if (item.name === "totem_of_undying") {
                await bot.tossStack(item)
                break
            }
        }
    }

    return this
}