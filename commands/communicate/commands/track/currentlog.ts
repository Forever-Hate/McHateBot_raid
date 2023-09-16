import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger';
import { TrackLog, tracker } from '../../../main/tracker';
import { getDiscordTrackLogEmbedField } from '../../../../utils/util';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('currentlog')
		.setDescription('取得當前的拾取紀錄'),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行currentlog指令");
		await interaction.deferReply({ ephemeral: true });
		const track:TrackLog = tracker.getTrackLog(true)
		const embed = {
			color: 1752220,
			title: '當前拾取紀錄一覽',
			thumbnail: {
				url: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/a/a9/Emerald_Ore_JE4_BE3.png',
			},
			fields: getDiscordTrackLogEmbedField(track),
			timestamp: new Date().toISOString(),
			footer: {
				text: `由 McHateBot_raid 建立`,
			},
		};

		await interaction.followUp({embeds:[embed],ephemeral:true});
	},
};
