// Support qualitys: 128k 320k flac wav

const sources: Array<{
  id: string
  name: string
  disabled: boolean
  supportQualitys: Partial<Record<LX.OnlineSource, LX.Quality[]>>
}> = [
  // [二开] Alist 网盘音乐源：直链播放，统一标 128k
  {
    id: 'alist',
    name: 'Alist',
    disabled: false,
    supportQualitys: { alist: ['128k'] },
  },
  // [二开] 小爱音乐：经自建服务端（飞牛 Docker）取链，统一标 128k
  {
    id: 'xiaiai',
    name: '小爱音乐',
    disabled: false,
    supportQualitys: { xiaiai: ['128k'] },
  },
  // [二开] TVBox音乐：服务器上所有 py 源的单一入口（网关代理），统一标 128k
  { id: 'tvbox', name: 'TVBox音乐', disabled: false, supportQualitys: { tvbox: ['128k'] } },
]

export default sources
