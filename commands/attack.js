module.exports = async (bot,settings) => {
    let moblist = (settings.mob_list)
    setInterval(async ()=>{
        for(let mobentity in bot.entities)
        {
            if(bot.entities[mobentity].type === 'mob')
            {
                if(moblist.includes(bot.entities[mobentity].name))
                {
                    await bot.attack(bot.entities[mobentity])
                }
            }
        }

    },settings.Interval)
}
