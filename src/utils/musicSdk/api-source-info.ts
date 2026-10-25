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
  // [二开] TVBox py 音乐源（本地内置、离线可用，统一标 128k）
  { id: 'pyjuhe', name: '音乐聚合', disabled: false, supportQualitys: { pyjuhe: ['128k'] } },
  { id: 'pyqianqian', name: '千千音乐', disabled: false, supportQualitys: { pyqianqian: ['128k'] } },
  { id: 'pyyingzi', name: '影子音乐', disabled: false, supportQualitys: { pyyingzi: ['128k'] } },
  { id: 'pyfengye', name: '枫叶音乐', disabled: false, supportQualitys: { pyfengye: ['128k'] } },
  { id: 'pykuwo', name: '酷我音乐', disabled: false, supportQualitys: { pykuwo: ['128k'] } },
  { id: 'pydj1', name: 'DJ哟哟', disabled: false, supportQualitys: { pydj1: ['128k'] } },
  { id: 'pydj2', name: 'DJ呦呦', disabled: false, supportQualitys: { pydj2: ['128k'] } },
  { id: 'pyaiting', name: '爱听音乐', disabled: false, supportQualitys: { pyaiting: ['128k'] } },
  { id: 'tvbox', name: 'TVBox音乐', disabled: false, supportQualitys: { tvbox: ['128k'] } },
  { id: 'pyqishui', name: '汽水音乐', disabled: false, supportQualitys: { pyqishui: ['128k'] } },
]

export default sources
