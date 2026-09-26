// Alist 连接配置 —— 二开：把 Alist 网盘当作洛雪音乐源
//
// 旧方式：修改下面常量并重新打包（已废弃）。
// 新方式：在 App「设置 → Alist 网盘」里直接填写后生效，无需重新打包。
//
// 注意：
// 1. BASE 结尾不要带斜杠，例如 https://drive.example.com
// 2. 优先使用 TOKEN（后台「设置 → 其他」里生成的 API Token）；若留空，则改用 USER/PASS 登录获取。
// 3. 若 Alist 已开启游客访问且无需鉴权，TOKEN/USER/PASS 全留空即可。
// 4. ROOT 限定只在该目录内搜索/取链，例如 '/音乐'，避免搜到整个网盘。

import settingState from '@/store/setting/state'
import { httpFetch } from '../../request'

// 打包兜底默认值（若设置页未填写则回退到这些值）
export const ALIST_BASE = ''
export const ALIST_TOKEN = ''
export const ALIST_USER = ''
export const ALIST_PASS = ''
export const ALIST_ROOT = '/'

// 运行时从设置状态读取最新配置
export const getAlistConfig = () => {
  const raw = settingState.setting
  const base = (raw['alist.base'] ?? ALIST_BASE).replace(/\/+$/, '')
  const root = raw['alist.root'] ?? ALIST_ROOT
  return {
    base,
    token: raw['alist.token'] ?? ALIST_TOKEN,
    user: raw['alist.user'] ?? ALIST_USER,
    pass: raw['alist.pass'] ?? ALIST_PASS,
    root: root.startsWith('/') ? root : '/' + root,
  }
}

// 支持的音频后缀（用于搜索/目录浏览时过滤非音频文件）
const AUDIO_EXT = ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'ape', 'wma', 'dsf', 'dff', 'tta', 'ac3']
export const isAudio = (name = '') => {
  const i = name.lastIndexOf('.')
  return i > 0 && AUDIO_EXT.includes(name.slice(i + 1).toLowerCase())
}

// 获取用于请求的 Authorization Token（支持 Token 直用或账号密码登录）
let _tokenCache = { key: '', token: '', expire: 0 }
export const getAlistToken = async() => {
  const cfg = getAlistConfig()
  if (!cfg.base) return { base: '', token: '', error: '未配置服务器地址' }

  const cacheKey = `${cfg.base}|${cfg.user}|${cfg.pass}`
  if (_tokenCache.key === cacheKey && Date.now() < _tokenCache.expire && _tokenCache.token) {
    return { base: cfg.base, token: _tokenCache.token, error: '' }
  }

  // 优先使用固定 Token
  if (!cfg.user || !cfg.pass) {
    _tokenCache = { key: cacheKey, token: cfg.token, expire: Date.now() + 3600 * 1000 }
    return { base: cfg.base, token: _tokenCache.token, error: '' }
  }

  try {
    const { body } = await httpFetch(`${cfg.base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: cfg.user, password: cfg.pass },
    }).promise
    if (body?.code !== 200) {
      return { base: cfg.base, token: '', error: '登录失败：' + (body?.message || '未知错误') }
    }
    _tokenCache = {
      key: cacheKey,
      token: body.data.token,
      expire: Date.now() + ((body.data.expire ?? 3600) * 1000),
    }
    return { base: cfg.base, token: _tokenCache.token, error: '' }
  } catch (err) {
    return { base: cfg.base, token: '', error: '登录异常：' + (err?.message || err) }
  }
}

// 测试连接：返回 { ok, message, data }
export const testAlistConnection = async() => {
  const cfg = getAlistConfig()
  if (!cfg.base) return { ok: false, message: '未配置服务器地址', data: null }

  const { token, error } = await getAlistToken()
  if (error) return { ok: false, message: error, data: null }

  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = token

  try {
    // 先尝试 /api/me（v3 鉴权接口）
    const { body } = await httpFetch(`${cfg.base}/api/me`, {
      method: 'GET',
      headers,
    }).promise
    if (body?.code === 200) {
      return { ok: true, message: `连接成功，用户名：${body.data?.username || '未知'}`, data: body.data }
    }
    // 失败则回退到 /api/public/settings
    const { body: pub } = await httpFetch(`${cfg.base}/api/public/settings`, {
      method: 'GET',
      headers,
    }).promise
    if (pub?.code === 200) {
      return { ok: true, message: '连接成功（公开访问）', data: pub.data }
    }
    return { ok: false, message: '接口返回异常：' + JSON.stringify(body || pub), data: null }
  } catch (err) {
    return { ok: false, message: '请求失败：' + (err?.message || err), data: null }
  }
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

// Alist POST 请求辅助（供测试按钮直接使用）
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

// 当服务端 /api/fs/search 不可用时，用列目录遍历做 fallback（限制深度 3）
export const searchByListFallback = async(root, keyword, limit = 30) => {
  const matched = []
  const visited = new Set()
  const lowerKeyword = keyword.toLowerCase()

  const fsList = async(path) => {
    const data = await alistRequest('/api/fs/list', { path, page: 1, per_page: 0, refresh: false })
    return extractList(data).map(f => ({
      ...f,
      path: f.path || joinPath(path, f.name),
    }))
  }

  const walk = async(dir, depth) => {
    if (depth > 3 || matched.length >= limit) return
    if (visited.has(dir)) return
    visited.add(dir)
    const content = await fsList(dir).catch(() => [])
    for (const f of content) {
      if (matched.length >= limit) break
      if (f.is_dir) {
        await walk(f.path, depth + 1)
      } else if (isAudio(f.name) && f.name.toLowerCase().includes(lowerKeyword)) {
        matched.push(f)
      }
    }
  }

  await walk(root, 0)
  return matched
}

// 调试：测试 Alist 搜索接口。若服务端未启用搜索，自动 fallback 到列目录遍历。
export const testAlistSearch = async(keyword = '爱') => {
  const cfg = getAlistConfig()
  if (!cfg.base) return { ok: false, message: '未配置服务器地址', data: null }

  // 先探测 /api/fs/search 是否可用
  try {
    const data = await alistRequest('/api/fs/search', {
      parent: cfg.root,
      keywords: keyword,
      page: 1,
      per_page: 1,
      scope: 2,
    })
    return { ok: true, message: '搜索接口可用', data }
  } catch (err) {
    if (String(err?.message || '').includes('search not available')) {
      // fallback 到列目录遍历
      const matched = await searchByListFallback(cfg.root, keyword, 10)
      return {
        ok: true,
        message: `服务端未启用搜索，已自动 fallback 列目录遍历，找到 ${matched.length} 首`,
        data: { fallback: true, matched },
      }
    }
    return { ok: false, message: '搜索失败：' + (err?.message || err), data: null }
  }
}

// 调试：测试 Alist 列目录接口，返回原始结果摘要
export const testAlistList = async() => {
  const cfg = getAlistConfig()
  if (!cfg.base) return { ok: false, message: '未配置服务器地址', data: null }

  try {
    const data = await alistRequest('/api/fs/list', { path: cfg.root, page: 1, per_page: 0, refresh: false })
    return { ok: true, message: '列目录成功', data }
  } catch (err) {
    return { ok: false, message: '列目录失败：' + (err?.message || err), data: null }
  }
}
