import apiSourceInfo from './api-source-info'

// import temp_api_kw from './kw/api-temp'
// import test_api_kg from './kg/api-test'
// import test_api_kw from './kw/api-test'
// import test_api_tx from './tx/api-test'
// import test_api_wy from './wy/api-test'
// import test_api_mg from './mg/api-test'

// [二开] 内置直连取链：无自定义音源时，酷狗可直连播放（TVBox csp_Kugou 思路）
import directApiKg from './kg/api-direct'
// [二开] 小爱音乐：经自建服务端取链（飞牛 Docker 上运行的 FastAPI 壳）
import directApiXiaiai from './xiaiai'

import settingState from '@/store/setting/state'


const apiList = {
  // temp_api_kw,
  // // test_api_bd: require('./bd/api-test'),
  // test_api_kg,
  // test_api_kw,
  // test_api_tx,
  // test_api_wy,
  // test_api_mg,
  // direct_api_kg,
  // direct_api_kw,
  // direct_api_tx,
  // direct_api_wy,
  // direct_api_mg,
  // test_api_tx: require('./tx/api-test'),
  // test_api_wy: require('./wy/api-test'),
  // test_api_xm: require('./xm/api-test'),
}

// [二开] 无自定义音源时的内置直连兜底（不依赖外部脚本）
const builtInApis = {
  kg: directApiKg,
  xiaiai: directApiXiaiai,
}
const supportQuality = {
  // [二开] 未配置任何音源（默认 ''）时，kg / 小爱音乐 走内置直连取链，需声明可用音质
  // 否则 global.lx.qualityList 为空 → assertApiSupport 为 false → 播放链路跳过该源
  '': { kg: ['128k'], xiaiai: ['128k'] },
}

for (const api of apiSourceInfo) {
  supportQuality[api.id] = api.supportQualitys
  // for (const source of Object.keys(api.supportQualitys)) {
  //   const path = `./${source}/api-${api.id}`
  //   console.log(path)
  //   apiList[`${api.id}_api_${source}`] = path
  // }
}

const getAPI = source => apiList[`${settingState.setting['common.apiSource']}_api_${source}`]

const apis = source => {
  if (/^user_api/.test(settingState.setting['common.apiSource'])) return global.lx.apis[source]
  const api = getAPI(source)
  if (api) return api
  // [二开] 内置直连兜底：未配置自定义音源时，酷狗可直连取链播放
  if (builtInApis[source]) return builtInApis[source]
  throw new Error('Api is not found')
}

export { apis, supportQuality }
