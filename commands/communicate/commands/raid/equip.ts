import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { logger } from '../../../../utils/logger';
import { localizer } from '../../../../utils/localization';
import { raid } from '../../../main/raid';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('equip')
		.setDescription('裝備整套裝備(可裝備所有劍及鞘翅)'),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行equip指令");
		raid.equipped();
		await interaction.reply({content:localizer.format("DC_COMMAND_EXECUTED") as string,ephemeral:true});
	},
};