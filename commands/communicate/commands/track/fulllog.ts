import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger';
import { TrackLog, tracker } from '../../../main/tracker';
import { getDiscordTrackLogEmbedField, settings } from '../../../../utils/util';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fulllog')
		.setDescription('取得所有的拾取紀錄'),
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行fulllog指令");
		await interaction.deferReply({ ephemeral: true });
		const track:TrackLog = tracker.getTrackLog(false) as TrackLog
		const embed = {
			color: 1752220,
			title: '所有拾取紀錄一覽',
			thumbnail: {
				url: settings.embed_thumbnail_url,
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