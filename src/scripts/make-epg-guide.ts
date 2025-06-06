import { XMLParser } from "fast-xml-parser"
import { TeeviLiveProgram } from "@teeviapp/core"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"

type EPGData = {
  tv: {
    channel: {
      id: string
    }[]
    programme: {
      title: string
      desc?: string
      start: string
      stop: string
      channel: string
    }[]
  }
}

/**
 * Dictionary to map original channel IDs to playlist IDs.
 * Channels not in this dictionary will be filtered out
 */
const channelMapping: Record<string, string> = {
  "20.it": "20.it",
  "Boing.it": "BoingItaly.it",
  "Canale5.it": "Canale5.it",
  "Cartoonito.it": "CartoonitoItaly.it",
  "Cielo.it": "CieloTV.it",
  "Cine34.it": "Cine34.it",
  "Dmax.it": "DMAXItaly.it",
  "Focus.it": "Focus.it",
  "Food Network Hd.it": "FoodNetworkItaly.it",
  "Frisbee.it": "Frisbee.it",
  "Giallo.it": "Giallo.it",
  "Hgtv.it": "HGTVItaly.it",
  "Iris.it": "Iris.it",
  "Italia1.it": "Italia1.it",
  "Italia2.it": "Italia2.it",
  "K2.it": "K2.it",
  "La5.it": "La5.it",
  "La7.it": "La7.it",
  "La7D.it": "La7d.it",
  "Mediaset Extra.it": "MediasetExtra.it",
  "Mediaset Tgcom24.it": "TGCom24.it",
  "Motor Trend.it": "MotorTrend.it",
  "Nove.it": "Nove.it",
  "Qvc.it": "QVCItaly.it",
  "Rai 4K.it": "Rai4K.it",
  "Rai Gulp.it": "RaiGulp.it",
  "Rai Movie.it": "RaiMovie.it",
  "Rai News.it": "RaiNews24.it",
  "Rai Premium.it": "RaiPremium.it",
  "Rai Scuola.it": "RaiScuola.it",
  "Rai Sport1.it": "RaiSport.it",
  "Rai Storia.it": "RaiStoria.it",
  "Rai Yoyo.it": "RaiYoyo.it",
  "Rai1.it": "Rai1.it",
  "Rai2.it": "Rai2.it",
  "Rai3.it": "Rai3.it",
  "Rai4.it": "Rai4.it",
  "Rai5.it": "Rai5.it",
  "Realtime.it": "RealTimeItaly.it",
  "Rete4.it": "Rete4.it",
  "Super.it": "Super.it",
  "Topcrime.it": "TopCrime.it",
  "Tv2000.it": "TV2000.va",
  "Tv8.it": "TV8.it",
  "Twentyseven.it": "27Twentyseven.it",
  "Warner Tv.it": "WarnerTVItaly.it",
}

/**
 * Checks if a channel ID exists in our mapping
 */
function isChannelSupported(channelId: string): boolean {
  return channelId in channelMapping
}

/**
 * Maps an original channel ID to our preferred ID format
 */
function mapChannelId(originalId: string): string {
  if (isChannelSupported(originalId)) {
    return channelMapping[originalId]
  } else {
    throw new Error(`Channel ID "${originalId}" is not supported`)
  }
}

/**
 * Converts a date string from format "20250606190500 +0000" to ISO UTC format
 * Example: "20250606190500 +0000" -> "2025-06-06T19:05:00Z"
 */
function parseDateToISOUTC(input: string): string {
  const match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (match) {
    const [_, year, month, day, hour, minute, second] = match
    const isoUTC = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
    return isoUTC
  } else {
    throw new Error("Invalid date format in input: " + input)
  }
}

async function fetchEPGData(): Promise<string> {
  try {
    const response = await fetch("https://www.open-epg.com/files/italy2.xml")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.text()
    return data
  } catch (error) {
    console.error("Error fetching EPG data:", error)
    throw error
  }
}

function parseEPGData(xmlData: string): EPGData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  })
  return parser.parse(xmlData)
}

function convertEPGToTeeviLiveProgram(epgData: EPGData): TeeviLiveProgram[] {
  return epgData.tv.programme
    .filter((program) => {
      return isChannelSupported(program.channel)
    })
    .map((program) => {
      return {
        id: `${program.channel}-${program.start}`, // Unique ID based on channel and start time
        title: program.title,
        description: program.desc,
        startDate: parseDateToISOUTC(program.start),
        endDate: parseDateToISOUTC(program.stop),
        channelId: mapChannelId(program.channel),
      }
    })
}

async function writeGuideToDisk() {
  const epgData = parseEPGData(await fetchEPGData())
  const teeviPrograms = convertEPGToTeeviLiveProgram(epgData)

  const outputFilePath = "assets/data/epg-guide.json"
  await mkdir(dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, JSON.stringify(teeviPrograms, null, 2))
}

writeGuideToDisk()
