import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger';
import { localizer } from '../../../../utils/localization';
import { raid } from '../../../main/raid';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unequip')
		.setDescription('脫下整套裝備，並丟出(包含手上物品)'),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行unequip指令");
		raid.unequipped();
		await interaction.reply({content:localizer.format("DC_COMMAND_EXECUTED") as string,ephemeral:true});
	},
};