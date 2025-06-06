import type { TeeviLiveExtension, TeeviLiveProgram } from "@teeviapp/core"
import playlistParser from "iptv-playlist-parser"

async function fetchPlaylist(): Promise<playlistParser.Playlist> {
  const response = await fetch(
    "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_italy.m3u8"
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch playlist: ${response.status} ${response.statusText}`
    )
  }

  const playlistContent = await response.text()
  return playlistParser.parse(playlistContent)
}

async function fetchPrograms(): Promise<TeeviLiveProgram[]> {
  const response = await fetch(
    "https://teeviapp.github.io/teevi-live-italy/data/epg-guide.json"
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch programs: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export default {
  fetchLiveChannels: async () => {
    const playlist = await fetchPlaylist()
    return playlist.items.map((item) => ({
      id: item.tvg.id,
      name: item.name.replace(/[ⒼⓈ]/g, "").trim(),
      type: "channel",
      logoURL: item.tvg.logo,
      language: "it",
      geoblocked: item.tvg.name.includes("Ⓖ"),
    }))
  },
  fetchChannelPrograms: async (startDate?: string, endDate?: string) => {
    let programs = await fetchPrograms()
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0)
      const end = endDate ? new Date(endDate) : new Date(8640000000000000)

      return programs.filter((program) => {
        const programStart = new Date(program.startDate)
        const programEnd = new Date(program.endDate)

        return programStart <= end && programEnd >= start
      })
    }

    return programs
  },
  fetchLiveVideoAsset: async (channelId: string) => {
    const playlist = await fetchPlaylist()
    const channel = playlist.items.find((item) => item.tvg.id === channelId)
    if (!channel) {
      return null
    }

    let headers: Record<string, string> = {}
    if (channel.http?.referrer) {
      headers["Referer"] = channel.http.referrer
    }
    if (channel.http?.["user-agent"]) {
      headers["User-Agent"] = channel.http["user-agent"]
    }

    return {
      url: channel.url,
      headers: headers,
    }
  },
} satisfies TeeviLiveExtension
