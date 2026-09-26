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
]

export default sources
