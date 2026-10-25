// import './app_setting'

declare namespace LX {
  type OnlineSource = 'kw' | 'kg' | 'tx' | 'wy' | 'mg' | 'alist' | 'xiaiai' | 'pyjuhe' | 'pyqianqian' | 'pyyingzi' | 'pyfengye' | 'pykuwo' | 'pydj1' | 'pydj2' | 'pyaiting' | 'pyqishui' | 'tvbox'
  type Source = OnlineSource | 'local'
  type Quality = '128k' | '320k' | 'flac' | 'flac24bit' | '192k' | 'ape' | 'wav'
  type QualityList = Partial<Record<LX.Source, LX.Quality[]>>

  type ShareType = 'system' | 'clipboard'

  type UpdateStatus = 'downloaded' | 'downloading' | 'error' | 'checking' | 'idle'
  interface VersionInfo {
    version: string
    desc: string
  }
}
