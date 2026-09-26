// Alist 音乐源（二开模块）
// 把 Alist 网盘当作一个在线音乐源接入洛雪：
//   - 搜索：调用 Alist /api/fs/search，若服务端未启用搜索则 fallback 到列目录遍历
//   - 歌单/文件夹浏览：调用 /api/fs/list 列出目录，把文件夹当歌单、音频文件当歌曲
//   - 播放：调用 Alist /api/fs/get 取直链（raw_url），自动兼容签名验证
//   - 封面：取 Alist 生成的 thumb/thumbnail
//   - 歌词：在同级目录查找同名 .lrc 并拉取文本
//
// 该模块完全独立，合并官方更新时只需保留 src/utils/musicSdk/alist/ 目录，
// 并在 src/utils/musicSdk/index.js、types/common.d.ts、lang 里做少量新增登记即可。

import { httpFetch } from '../../request'
import {
  getAlistConfig,
  getAlistToken,
  isAudio,
  searchByListFallback,
} from './config'

// 统一的 Alist POST 请求，返回 data 字段；非 200 抛错
const alistRequest = async(apiPath, body) => {
  const cfg = getAlistConfig()
  if (!cfg.base) throw new Error('Alist 未配置服务器地址')
  const { token, error } = await getAlistToken()
  if (error) throw new Error(error)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = token
  const { body: resp } = await httpFetch(`${cfg.base}${apiPath}`, {
    method: 'POST',
    headers,
    body,
  }).promise
  if (resp?.code !== 200) throw new Error('Alist 请求失败(' + apiPath + '): ' + (resp?.message || JSON.stringify(resp)))
  return resp.data
}

// 拼接 Alist 路径（root 末尾是否有斜杠都兼容）
const joinPath = (parent, name) => {
  if (!parent || parent === '/') return '/' + name
  return parent.replace(/\/+$/, '') + '/' + name
}

// 兼容各种 Alist 返回：data 直接是数组 / data.content / data.data / data.result
const extractList = (data) => {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  return data.content ?? data.data ?? data.result ?? []
}

// 取目录/文件的签名（Alist 开启“签名验证”时需要）
const getSign = async(path) => {
  try {
    const data = await alistRequest('/api/fs/get_sign', { path })
    return data?.sign || ''
  } catch {
    return ''
  }
}

// 带签名重试的 fs/get
const fsGet = async(path) => {
  try {
    return await alistRequest('/api/fs/get', { path })
  } catch (err) {
    if (String(err?.message || '').includes('sign')) {
      const sign = await getSign(path)
      if (sign) return await alistRequest('/api/fs/get', { path, sign })
    }
    throw err
  }
}

// 带签名重试的 fs/list；返回 content 时已补齐完整 path
const fsList = async(path) => {
  const call = async() => {
    const data = await alistRequest('/api/fs/list', { path, page: 1, per_page: 0, refresh: false })
    const list = extractList(data).map(f => ({
      ...f,
      path: f.path || joinPath(path, f.name),
    }))
    return { content: list }
  }
  try {
    return await call()
  } catch (err) {
    if (String(err?.message || '').includes('sign')) {
      const sign = await getSign(path)
      if (sign) {
        const data = await alistRequest('/api/fs/list', { path, page: 1, per_page: 0, refresh: false, sign })
        const list = extractList(data).map(f => ({
          ...f,
          path: f.path || joinPath(path, f.name),
        }))
        return { content: list }
      }
    }
    throw err
  }
}

// 把 Alist 文件对象转成洛雪搜索结果项（旧格式，框架会再 toNewMusicInfo）
const buildMusicInfo = (file) => {
  const path = file.path || file
  const fileName = file.name || path.split('/').pop() || '未知'
  const name = fileName.replace(/\.[^.]+$/, '')
  const size = file.size ?? 0
  return {
    name,
    singer: '',
    source: 'alist',
    songmid: path,
    albumId: '',
    interval: '',
    albumName: '',
    lrc: null,
    img: file.thumb || file.thumbnail || null,
    otherSource: null,
    // 洛雪按 quality 决定可播音质；Alist 是直链，统一标 128k 即可
    types: [{ type: '128k', size: String(size) }],
    _types: { '128k': { size: String(size) } },
    typeUrl: {},
  }
}

// 从 fs/get 的返回里拼出可用直链
const buildRawUrl = (data) => {
  const cfg = getAlistConfig()
  if (data.raw_url) return data.raw_url
  if (data.url) return `${cfg.base}${data.url.startsWith('/') ? '' : '/'}${data.url}`
  return ''
}

// ---- 搜索 ----
const musicSearch = {
  limit: 30,
  async search(str, page = 1, limit = 30) {
    const cfg = getAlistConfig()
    if (!cfg.base) {
      return { list: [], allPage: 1, total: 0, limit, source: 'alist' }
    }

    let useFallback = false
    // 先尝试官方搜索接口
    const data = await alistRequest('/api/fs/search', {
      parent: cfg.root,
      keywords: str,
      page,
      per_page: limit,
      scope: 2,
    }).catch(err => {
      console.warn('Alist search error:', err)
      if (String(err?.message || '').includes('search not available')) {
        useFallback = true
        return { content: [], total: 0 }
      }
      return { content: [], total: 0 }
    })

    let content = []
    if (useFallback) {
      content = await searchByListFallback(cfg.root, str, limit)
    } else {
      content = extractList(data).filter(f => !f.is_dir && isAudio(f.name))
    }

    const list = content.map(buildMusicInfo)
    const total = useFallback ? list.length : (data?.total ?? list.length)
    return {
      list,
      allPage: 1,
      total,
      limit,
      source: 'alist',
    }
  },
}

// ---- 歌单/文件夹浏览 ----
const songList = {
  // 只有一组“默认”排序
  sortList: [
    { name: '默认', tid: 'recommend', id: 'default' },
  ],
  // 固定一个“全部文件夹”标签，避免歌单页为空
  async getTags() {
    return {
      tags: [{
        name: '文件夹',
        list: [{ parent_id: 'root', parent_name: '文件夹', id: 'root', name: '全部文件夹', source: 'alist' }],
      }],
      hotTag: [{ parent_id: 'root', parent_name: '文件夹', id: 'root', name: '全部文件夹', source: 'alist' }],
      source: 'alist',
    }
  },
  // 列出 Alist 根目录下的文件夹（作为歌单）
  async getList(sortId = 'default', tagId = 'root', page = 1) {
    const cfg = getAlistConfig()
    if (!cfg.base) {
      return { list: [], total: 0, page, limit: 30, maxPage: 1, key: 'alist', source: 'alist', tagId, sortId }
    }
    const { content } = await fsList(cfg.root).catch(err => {
      console.warn('Alist list root error:', err)
      return { content: [] }
    })
    const folders = content.filter(f => f.is_dir)
    const list = folders.map(f => ({
      id: f.path,
      name: f.name,
      author: '',
      source: 'alist',
      total: 0,
      desc: f.path,
    }))
    return {
      list,
      total: list.length,
      page,
      limit: 30,
      maxPage: 1,
      key: 'alist',
      source: 'alist',
      tagId,
      sortId,
    }
  },
  // 歌单详情：列出文件夹里的音频文件
  async getListDetail(id, page = 1) {
    const cfg = getAlistConfig()
    if (!cfg.base) {
      return { list: [], total: 0, page, limit: 30, maxPage: 1, key: id, id, source: 'alist', info: { name: id } }
    }
    const { content } = await fsList(id).catch(err => {
      console.warn('Alist list detail error:', err)
      return { content: [] }
    })
    const files = content.filter(f => !f.is_dir && isAudio(f.name))
    const list = files.map(buildMusicInfo)
    return {
      list,
      total: list.length,
      page,
      limit: 30,
      maxPage: 1,
      key: id,
      id,
      source: 'alist',
      info: { name: id.split('/').pop() || id, desc: id },
    }
  },
}

// ---- 取播放地址 ----
const getMusicUrl = (songInfo, type) => {
  return {
    promise: fsGet(songInfo.songmid).then(data => {
      const url = buildRawUrl(data)
      if (!url) throw new Error('Alist 未返回播放地址')
      return { url, type: '128k' }
    }),
  }
}

// ---- 取封面 ----
const getPic = (songInfo) => {
  return fsGet(songInfo.songmid)
    .then(data => data.thumb || data.thumbnail || '')
    .catch(() => '')
}

// ---- 取歌词（同级同名 .lrc）----
const getLyric = (songInfo) => {
  return {
    promise: (async() => {
      const path = songInfo.songmid
      const dir = path.substring(0, path.lastIndexOf('/')) || '/'
      const base = (path.split('/').pop() || '').replace(/\.[^.]+$/, '')
      const { content } = await fsList(dir).catch(() => ({ content: [] }))
      const lrcFile = content.find(f => !f.is_dir && f.name === `${base}.lrc`)
      if (!lrcFile) throw new Error('fail')
      const lrcData = await fsGet(`${dir}/${lrcFile.name}`)
      const url = buildRawUrl(lrcData)
      if (!url) throw new Error('fail')
      const { body } = await httpFetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'text/plain' },
      }).promise
      const lyric = typeof body === 'string' ? body : ''
      if (!lyric.trim()) throw new Error('fail')
      return { lyric, tlyric: '', rlyric: '', lxlyric: '' }
    })(),
  }
}

const alist = {
  musicSearch,
  songList,
  getMusicUrl,
  getPic,
  getLyric,
  init() {
    return Promise.resolve()
  },
}

export default alist
