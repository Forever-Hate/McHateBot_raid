import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { logger } from '../../../../utils/logger';
import { exchangeManager } from '../../../main/Exchange';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('exchange')
		.setDescription('使用經驗值兌換物品')
		.addStringOption(option =>
			option.setName('playerid')
				.setDescription('接收物品的玩家ID')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('coordinate')
				.setDescription('座標。由上到下(A-F)由左至右(1-9) A1 = 海綿 B1 = 鐵馬鎧')
				.setRequired(true)),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行exchange指令");
		await interaction.deferReply({ ephemeral: true });
		const playerid = interaction.options.getString("playerid")
		const coordinate = interaction.options.getString("coordinate")
		const msg:string = await exchangeManager.exchange_item(playerid!,["",coordinate!],true)
		await interaction.followUp({content:msg as string}); 
	},
};