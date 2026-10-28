import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { search } from '@/core/search/music'
import searchMusicState, { type Source } from '@/store/search/music/state'
import { overwriteListMusics } from '@/core/list'
import { playList } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { toast } from '@/utils/tools'
import { toOldMusicInfo } from '@/utils'
import { showVideoPlayer } from '@/navigation'
import musicSdk from '@/utils/musicSdk'

// export type MusicListProps = Pick<OnlineListProps,
// 'onLoadMore'
// | 'onPlayList'
// | 'onRefresh'
// >

export interface MusicListType {
  loadList: (text: string, source: Source) => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const searchInfoRef = useRef<{ text: string, source: Source }>({ text: '', source: 'kw' })
  const isUnmountedRef = useRef(false)
  useImperativeHandle(ref, () => ({
    async loadList(text, source) {
      // const listDetailInfo = searchMusicState.listDetailInfo
      listRef.current?.setList([], false, source == 'all')
      if (searchMusicState.searchText == text && searchMusicState.source == source && searchMusicState.listInfos[searchMusicState.source]!.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(searchMusicState.listInfos[searchMusicState.source]!.list, false, source == 'all')
        })
      } else {
        listRef.current?.setStatus('loading')
        const page = 1
        searchInfoRef.current.text = text
        searchInfoRef.current.source = source
        return search(text, page, source).then((list) => {
          // const result = setListInfo(listDetail, id, page)
          if (isUnmountedRef.current) return
          requestAnimationFrame(() => {
            listRef.current?.setList(list, false, source == 'all')
            listRef.current?.setStatus(searchMusicState.listInfos[searchMusicState.source]!.maxPage <= page ? 'end' : 'idle')
          })
        }).catch(() => {
          listRef.current?.setStatus('error')
        })
      }
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    search(searchInfoRef.current.text, page, searchInfoRef.current.source).then((list) => {
      // const result = setListInfo(listDetail, searchMusicState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(list, false, searchInfoRef.current.source == 'all')
      listRef.current?.setStatus(searchMusicState.listInfos[searchInfoRef.current.source]!.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const info = searchMusicState.listInfos[searchInfoRef.current.source]!
    const page = info?.list.length ? info.page + 1 : 1
    search(searchInfoRef.current.text, page, searchInfoRef.current.source).then((list) => {
      // const result = setListInfo(listDetail, searchMusicState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(list, true, searchInfoRef.current.source == 'all')
      listRef.current?.setStatus(info.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }

  // [二开] 点击搜索结果列表中的某一首时，把整个搜索结果作为临时播放列表，
  // 从点击位置开始播放，实现连播。
  // TVBox 卡片条目（无播放地址，带 tvboxCard 字段，如酷我搜索返的歌手卡、
  // DJ 等源靠详情兜底的单曲）不可直接播放：与 TVBox 一致进详情——
  // 预取一次详情，多首跳歌单列表页；单首直接播（等效 TVBox 详情单曲行为）
  const handlePlayList: OnlineListProps['onPlayList'] = (index) => {
    const list = searchMusicState.listInfos[searchInfoRef.current.source]?.list
    if (!list?.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardId = (list[index] as any)?.tvboxCard as string | undefined
    if (cardId) {
      void musicSdk.tvbox.songList.getListDetail(cardId).then((detail) => {
        if (detail.list.length === 1) {
          void overwriteListMusics(LIST_IDS.TEMP, detail.list).then(() => {
            void playList(LIST_IDS.TEMP, 0)
          })
        } else if (detail.list.length > 1) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const m = list[index] as any
          navigations.pushSonglistDetailScreen(commonState.componentIds.home!, {
            id: cardId,
            name: m.name,
            author: m.singer,
            img: m.meta?.picUrl ?? m.img,
            desc: m.meta?.albumName ?? m.albumName,
            source: searchInfoRef.current.source as LX.OnlineSource,
          })
        } else {
          toast('该条目暂无内容')
        }
      }).catch(() => {
        toast('获取详情失败')
      })
      return
    }
    // [二开] Alist 视频条目：取直链后用系统/外部播放器打开，不走洛雪音频播放
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchItem = list[index] as any
    if (searchItem?.isAlistVideo && searchInfoRef.current.source === 'alist') {
      void (async() => {
        try {
          const { promise } = musicSdk.alist.getMusicUrl(toOldMusicInfo(searchItem) as any, '128k')
          const { url } = await promise
          if (!url) {
            toast('无法获取视频直链')
            return
          }
          showVideoPlayer({
            url,
            title: searchItem.name,
            artist: searchItem.singer || undefined,
            list: searchMusicState.listInfos[searchInfoRef.current.source]?.list,
            index,
          })
        } catch (err) {
          toast('打开视频失败：' + ((err as any)?.message || err))
        }
      })()
      return
    }
    // [二开] TVBox 视频条目（如爱听音乐 MV）：取直链后用内置视频播放器打开；
    // 取不到链（站方已关闭 MV 播放）给出友好提示
    if (searchItem?.isVideo && searchInfoRef.current.source === 'tvbox') {
      void (async() => {
        try {
          const { promise } = musicSdk.tvbox.getMusicUrl(toOldMusicInfo(searchItem) as any, '128k')
          const { url } = await promise
          if (!url) {
            toast('无法获取视频地址（该站可能已关闭 MV 播放）')
            return
          }
          showVideoPlayer({
            url,
            title: searchItem.name,
            artist: searchItem.singer || undefined,
            list: searchMusicState.listInfos[searchInfoRef.current.source]?.list,
            index,
          })
        } catch (err) {
          toast('打开视频失败：' + ((err as any)?.message || err))
        }
      })()
      return
    }
    // 连播列表剔除卡片条目与视频条目（均不可在洛雪内播放），否则自动连播滑到会报错；
    // 点击位置映射到剔除后的下标，连播顺序不变
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playable = list.filter((m) => !(m as any).tvboxCard && !(m as any).isAlistVideo && !(m as any).isVideo)
    const pIndex = list.slice(0, index).filter((m) => !(m as any).tvboxCard && !(m as any).isAlistVideo && !(m as any).isVideo).length
    void overwriteListMusics(LIST_IDS.TEMP, playable).then(() => {
      void playList(LIST_IDS.TEMP, pIndex)
    })
  }

  return <OnlineList
    ref={listRef}
    onRefresh={handleRefresh}
    onLoadMore={handleLoadMore}
    onPlayList={handlePlayList}
    checkHomePagerIdle
  />
})

