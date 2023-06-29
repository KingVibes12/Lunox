const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const formatDuration = require("../../../structures/FormatDuration.js");

module.exports = {
    name: "play",
    description: "Play your favorite song/s.",
    category: "Music",
    options: [
        {
            name: "query",
            description: "Provide song name/url.",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    permissions: {
        bot: ["Speak", "Connect"],
        channel: ["Speak", "Connect"],
        user: [],
    },
    settings: {
        inVc: true,
        sameVc: false,
        player: false,
        current: false,
        owner: false,
    },
    run: async (client, interaction, player) => {
        const song = interaction.options.getString("query");

        if (player && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(`\`❌\` | You must be on the same voice channel as mine to use this command.`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // This will force the playSource config to be set as 'spotify' if the config.js or .env file has 'disableYouTube' set to 'true' and the playSource value you set in the config.js is one of the constants in the 'youtube' array below.
        let playSource = client.config.playSource;

        const youtube = ["ytsearch", "ytmsearch"];
        if (client.config.disableYouTube === true && youtube.includes(playSource)) playSource = "spsearch"; // You must have the Lavasrc plugin installed on your lavalink for this to work!!!
        // This will not prevent the user to use a direct youtube url!!!
        // if you want to pass a "return" response to the user when you disable youtube, do some searching on the internet for how to do that!!!

        const res = await client.poru.resolve({ query: song, source: playSource, requester: interaction.user });
        const { loadType, tracks, playlistInfo } = res;

        if (loadType === "LOAD_FAILED" || loadType === "NO_MATCHES") {
            const embed = new EmbedBuilder().setColor(client.color).setDescription(`\`❌\` | Song was no found or Failed to load song!`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: false });

        if (!player) {
            player = await client.poru.createConnection({
                guildId: interaction.guild.id,
                voiceChannel: interaction.member.voice.channel.id,
                textChannel: interaction.channel.id,
                deaf: true,
            });
        }

        if (player.state !== "CONNECTED") player.connect();

        if (loadType === "PLAYLIST_LOADED") {
            for (const track of tracks) {
                player.queue.add(track);
            }

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(`\`☑️\` | **[${playlistInfo.name}](${song})** • \`${tracks.length}\` tracks • ${interaction.user}`);

            await interaction.editReply({ embeds: [embed] });
            if (!player.isPlaying && !player.isPaused) return player.play();
        } else if (loadType === "SEARCH_RESULT" || loadType === "TRACK_LOADED") {
            const track = tracks[0];

            player.queue.add(track);

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                    `\`☑️\` | **[${track.info.title ? track.info.title : "Unknown"}](${track.info.uri})** • \`${
                        track.info.isStream ? "LIVE" : formatDuration(track.info.length)
                    }\` • ${interaction.user}`,
                );

            await interaction.editReply({ embeds: [embed] });
            if (!player.isPlaying && !player.isPaused) return player.play();
        }
    },
};
