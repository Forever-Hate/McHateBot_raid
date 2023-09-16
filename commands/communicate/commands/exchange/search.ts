import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { logger } from '../../../../utils/logger';
import { exchangeManager } from '../../../main/Exchange';


module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('查詢當前經驗值能兌換多少指定的物品')
		.addStringOption(option =>
			option.setName('item')
				.setDescription('物品座標。座標由上到下(A-F)由左至右(1-9) A1 = 海綿 A2 = 墨囊')
				.setRequired(true)),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行search指令");
		await interaction.deferReply({ ephemeral: true });
		const msg:string = exchangeManager.inquire(undefined,["item",interaction.options.getString("item")!],true)
		await interaction.followUp({content:msg});
	},
};