import music from '@/utils/musicSdk'


// import { deduplicationList } from '@common/utils/renderer'

import { type ListInfo } from '@/store/songlist/state'
export type { ListInfoItem } from '@/store/songlist/state'

export type SearchListInfo = Omit<ListInfo, 'source' | 'maxPage'>


interface ListInfos extends Partial<Record<LX.OnlineSource, SearchListInfo>> {
  'all': SearchListInfo
}

export type Source = LX.OnlineSource | 'all'

export interface InitState {
  searchText: string
  source: Source
  sources: Source[]
  listInfos: ListInfos
  maxPages: Partial<Record<Source, number>>
}

const state: InitState = {
  searchText: '',
  source: 'kw',
  sources: [],
  listInfos: {
    all: {
      page: 1,
      limit: 15,
      total: 0,
      list: [],
      key: null,
      tagId: '',
      sortId: '',
    },
  },
  maxPages: {},
}

export const maxPages: Partial<Record<LX.OnlineSource, number>> = {}
for (const source of music.sources) {
  if (!music[source.id as LX.OnlineSource]?.songList?.search) continue
  state.sources.push(source.id as LX.OnlineSource)
  state.listInfos[source.id as LX.OnlineSource] = {
    page: 1,
    limit: 18,
    total: 0,
    list: [],
    key: null,
    tagId: '',
    sortId: '',
  }
  maxPages[source.id as LX.OnlineSource] = 0
}
// [二开] 保证 Alist 源在歌单状态里始终有 listInfo（文件夹浏览依赖它）
if (music.alist?.songList?.search && !state.listInfos.alist) {
  state.sources.push('alist')
  state.listInfos.alist = {
    page: 1,
    limit: 18,
    total: 0,
    list: [],
    key: null,
    tagId: '',
    sortId: '',
  }
  maxPages.alist = 0
}
state.sources.push('all')

export default state
