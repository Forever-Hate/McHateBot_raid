import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger';
import { TrackLog, tracker } from '../../../main/tracker';
import { formatTime, getDiscordTrackLogEmbedField, settings } from '../../../../utils/util';
const sd = require('silly-datetime')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('currentlog')
		.setDescription('取得當前的拾取紀錄')
		.addStringOption(option =>
			option.setName('index')
				.setDescription(`歷史log索引。可看到近25個最小統計時間(${formatTime(settings.track_record)})的資料`)
				.setAutocomplete(true)),
		
	async execute(interaction:ChatInputCommandInteraction) 
	{
		logger.i("執行currentlog指令");
		await interaction.deferReply({ ephemeral: true });
		const index = interaction.options.getString("index") ?? undefined 
		const result:TrackLog | string = tracker.getTrackLog(true,index);
		let track:TrackLog;
		if(result instanceof TrackLog)
		{
			track =  result;
		}
		else
		{
			await interaction.followUp({content:result,ephemeral:true});
			return;
		}
		const embed = {
			color: 1752220,
			title: index ? '歷史拾取紀錄一覽': '當前拾取紀錄一覽',
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
	async autocomplete(interaction:AutocompleteInteraction) 
	{
		logger.i("執行currentlog autocomplete");
		const logList = tracker.logList;
		//const focusedValue = interaction.options.getFocused();
		const choices = logList.map((log,index) => `${index+1}. ${sd.format(log.startTime, 'YYYY/MM/DD HH:mm:ss')} ~ ${sd.format(log.endTime, 'YYYY/MM/DD HH:mm:ss')} (共${formatTime(log.totalTime)})`)
		//const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		await interaction.respond(
			choices.map((choice,index) => ({ name: choice, value: (index+1).toString()})),
		);
	},
};
