import kw from './kw'
import kg from './kg'
import tx from './tx'
import wy from './wy'
import mg from './mg'
// import bd from './bd'
import xm from './xm'
// [二开] Alist 网盘音乐源
import alist from './alist'
// [二开] 小爱音乐（经自建服务端取链）
import xiaiai from './xiaiai'
// [二开] TVBox py 音乐源集合（千千/聚合/影子/枫叶/酷我/DJ哟哟/DJ呦呦/爱听/汽水）
import pySources from './py'
// [二开] TVBox音乐（服务器上多个 py 源，单一入口）
import tvbox from './tvbox'
import { supportQuality } from './api-source'
import { versionChars } from './versionChars'


const sources = {
  sources: [
    {
      name: '小窝音乐',
      id: 'kw',
    },
    {
      name: '小枸音乐',
      id: 'kg',
    },
    {
      name: 'QQ音乐',
      id: 'tx',
    },
    {
      name: '网易音乐',
      id: 'wy',
    },
    {
      name: '咪咕音乐',
      id: 'mg',
    },
    // {
    //   name: '百度音乐',
    //   id: 'bd',
    // },
    // [二开] Alist 网盘音乐源（仅作为独立搜索源出现在搜索页，不参与聚合搜索）
    {
      name: 'Alist',
      id: 'alist',
    },
    // [二开] 小爱音乐（经自建服务端取链）
    {
      name: '小爱音乐',
      id: 'xiaiai',
    },
    // [二开] TVBox py 音乐源（本地内置，离线可用；不参与聚合搜索，避免拖慢全局检索）
    ...Object.entries(pySources).map(([sid, s]) => ({ name: s.name, id: sid })),    // [二开] TVBox音乐（单一入口，服务器上所有 py 源）
    {
      name: 'TVBox音乐',
      id: 'tvbox',
    },
  ],
  kw,
  kg,
  tx,
  wy,
  mg,
  // bd,
  xm,
  // [二开] Alist 网盘音乐源
  alist,
  // [二开] 小爱音乐
  xiaiai,
  // [二开] TVBox py 音乐源集合
  ...pySources,
  // [二开] TVBox音乐
  tvbox,
}
export default {
  ...sources,
  supportQuality,
}

export const init = () => {
  const tasks = []
  for (let source of sources.sources) {
    let sm = sources[source.id]
    sm && sm.init && tasks.push(sm.init())
  }
  return Promise.all(tasks)
}


export const searchMusic = async({ name, singer, source: s, limit = 25 }) => {
  const trimStr = str => typeof str == 'string' ? str.trim() : str
  const musicName = trimStr(name)
  const tasks = []
  // [二开] alist / 小爱音乐 / py 源 不参与聚合搜索
  // （py 源多为 HTML 抓取或需签名的外部接口，放进聚合搜索会拖慢全局检索且易失败；
  //   它们作为独立搜索源 + 歌单分类浏览使用，更贴合「截图式分类浏览」需求）
  const excludeSource = ['xm', 'alist', 'xiaiai', 'pyjuhe', 'pyqianqian', 'pyyingzi', 'pyfengye', 'pykuwo', 'pydj1', 'pydj2', 'pyaiting', 'pyqishui', 'tvbox']
  for (const source of sources.sources) {
    if (!sources[source.id].musicSearch || source.id == s || excludeSource.includes(source.id)) continue
    tasks.push(sources[source.id].musicSearch.search(`${musicName} ${singer || ''}`.trim(), 1, limit).catch(_ => null))
  }
  return (await Promise.all(tasks)).filter(s => s)
}

export const findMusic = async(musicInfo) => {
  const { name, singer, albumName, interval, source: s } = musicInfo

  const lists = await searchMusic({ name, singer, source: s, limit: 25 })

  const singersRxp = /、|&|;|；|\/|,|，|\|/
  const sortSingle = singer => singersRxp.test(singer)
    ? singer.split(singersRxp).sort((a, b) => a.localeCompare(b)).join('、')
    : (singer || '')
  const sortMusic = (arr, callback) => {
    const tempResult = []
    for (let i = arr.length - 1; i > -1; i--) {
      const item = arr[i]
      if (callback(item)) {
        delete item.fSinger
        delete item.fMusicName
        delete item.fAlbumName
        delete item.fInterval
        tempResult.push(item)
        arr.splice(i, 1)
      }
    }
    tempResult.reverse()
    return tempResult
  }
  const getIntv = (interval) => {
    if (!interval) return 0
    // if (musicInfo._interval) return musicInfo._interval
    let intvArr = interval.split(':')
    let intv = 0
    let unit = 1
    while (intvArr.length) {
      intv += parseInt(intvArr.pop()) * unit
      unit *= 60
    }
    return intv
  }
  const trimStr = str => typeof str == 'string' ? str.trim() : (str || '')
  const filterStr = str => typeof str == 'string' ? str.replace(/\s|'|\.|,|，|&|"|、|\(|\)|（|）|`|~|-|<|>|\||\/|\]|\[|!|！/g, '') : String(str || '')
  const fMusicName = filterStr(name).toLowerCase()
  const fSinger = filterStr(sortSingle(singer)).toLowerCase()
  const fAlbumName = filterStr(albumName).toLowerCase()
  const fInterval = getIntv(interval)
  const isEqualsInterval = (intv) => Math.abs((fInterval || intv) - (intv || fInterval)) <= 5
  const isEqualsVersionMusicNameChar = (name) => {
    for (const char of versionChars) {
      if (name.includes(char) != fMusicName.includes(char)) return false
    }
    return true
  }
  const isIncludesName = (name) => (fMusicName.includes(name) || name.includes(fMusicName)) && isEqualsVersionMusicNameChar(name)
  const isIncludesSinger = (singer) => fSinger ? (fSinger.includes(singer) || singer.includes(fSinger)) : true
  const isEqualsAlbum = (album) => fAlbumName ? fAlbumName == album : true

  const result = lists.map(source => {
    for (const item of source.list) {
      item.name = trimStr(item.name)
      item.singer = trimStr(item.singer)
      item.fSinger = filterStr(sortSingle(item.singer).toLowerCase())
      item.fMusicName = filterStr(String(item.name ?? '').toLowerCase())
      item.fAlbumName = filterStr(String(item.albumName ?? '').toLowerCase())
      item.fInterval = getIntv(item.interval)
      // console.log(fMusicName, item.fMusicName, item.source)
      if (!isEqualsInterval(item.fInterval)) {
        item.name = null
        continue
      }
      if (item.fMusicName == fMusicName && isIncludesSinger(item.fSinger)) return item
    }
    for (const item of source.list) {
      if (item.name == null) continue
      if (item.fSinger == fSinger && isIncludesName(item.fMusicName)) return item
    }
    for (const item of source.list) {
      if (item.name == null) continue
      if (isEqualsAlbum(item.fAlbumName) && isIncludesSinger(item.fSinger) && isIncludesName(item.fMusicName)) return item
    }
    return null
  }).filter(s => s)
  const newResult = []
  if (result.length) {
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger && item.fMusicName == fMusicName && item.interval == interval))
    newResult.push(...sortMusic(result, item => item.fMusicName == fMusicName && item.fSinger == fSinger && item.fAlbumName == fAlbumName))
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger && item.fMusicName == fMusicName))
    newResult.push(...sortMusic(result, item => item.fMusicName == fMusicName && item.interval == interval))
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger && item.interval == interval))
    newResult.push(...sortMusic(result, item => item.interval == interval))
    newResult.push(...sortMusic(result, item => item.fMusicName == fMusicName))
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger))
    newResult.push(...sortMusic(result, item => item.fAlbumName == fAlbumName))
    for (const item of result) {
      delete item.fSinger
      delete item.fMusicName
      delete item.fAlbumName
      delete item.fInterval
    }
    newResult.push(...result)
  }
  // console.log(newResult)
  return newResult
}
