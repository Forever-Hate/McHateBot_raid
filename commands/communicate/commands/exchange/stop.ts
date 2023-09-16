import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { logger } from '../../../../utils/logger';
import { exchangeManager } from '../../../main/Exchange';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('停止交換物品'),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行stopExchange指令");
		await interaction.deferReply({ ephemeral: true });
		const msg:string = await exchangeManager.stopExchange(`discord user: ${interaction.user.displayName}`,true);
		await interaction.followUp({content:msg as string});
	},
};