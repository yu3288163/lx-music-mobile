import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { View } from 'react-native'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { clearListDetail, getListDetail, setListDetail, setListDetailInfo } from '@/core/songlist'
import songlistState from '@/store/songlist/state'
import { handlePlay } from './listAction'
import Header, { type HeaderType } from './Header'
import { useListInfo } from './state'
import { navigations } from '@/navigation'
import musicSdk from '@/utils/musicSdk'
import { toast } from '@/utils/tools'
import { showVideoPlayer } from '@/navigation'
import { toOldMusicInfo } from '@/utils'

export interface MusicListProps {
  componentId: string
}

export interface MusicListType {
  loadList: (source: LX.OnlineSource, listId: string) => void
}

export default forwardRef<MusicListType, MusicListProps>(({ componentId }, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const headerRef = useRef<HeaderType>(null)
  const isUnmountedRef = useRef(false)
  const info = useListInfo()

  useImperativeHandle(ref, () => ({
    async loadList(source, id) {
      clearListDetail()
      const listDetailInfo = songlistState.listDetailInfo
      listRef.current?.setList([])
      if (listDetailInfo.id == id && listDetailInfo.source == source && listDetailInfo.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(listDetailInfo.list)
          headerRef.current?.setInfo({
            name: (info.name || listDetailInfo.info.name) ?? '',
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            desc: listDetailInfo.info.desc || info.desc || '',
            playCount: (info.play_count ?? listDetailInfo.info.play_count) ?? '',
            imgUrl: info.img ?? listDetailInfo.info.img,
          })
        })
      } else {
        listRef.current?.setStatus('loading')
        const page = 1
        setListDetailInfo(info.source, info.id)
        headerRef.current?.setInfo({
          name: (info.name || listDetailInfo.info.name) ?? '',
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          desc: listDetailInfo.info.desc || info.desc || '',
          playCount: (info.play_count ?? listDetailInfo.info.play_count) ?? '',
          imgUrl: info.img ?? listDetailInfo.info.img,
        })
        return getListDetail(id, source, page).then((listDetail) => {
          const result = setListDetail(listDetail, id, page)
          if (isUnmountedRef.current) return
          requestAnimationFrame(() => {
            headerRef.current?.setInfo({
              name: (info.name || listDetailInfo.info.name) ?? '',
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              desc: listDetailInfo.info.desc || info.desc || '',
              playCount: (info.play_count ?? listDetailInfo.info.play_count) ?? '',
              imgUrl: info.img ?? listDetailInfo.info.img,
            })
            listRef.current?.setList(result.list)
            listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
          })
        }).catch(() => {
          if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
          listRef.current?.setStatus('error')
        })
      }
    },
  }))

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handlePlayList: OnlineListProps['onPlayList'] = (index) => {
    const listDetailInfo = songlistState.listDetailInfo
    // [二开] Alist 条目分三类：
    //  - isAlistFolder：点击下钻进子文件夹
    //  - isAlistVideo：点击取直链后用系统/外部播放器打开（洛雪不渲染视频）
    //  - 其余：走洛雪音频播放
    // 注意：listDetailInfo.list 是新格式（toNewMusicInfo 转换过），songmid 在 meta.songId；
    // isAlistFolder/isAlistVideo 由 toNewMusicInfo 的二开透传逻辑保留
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = listDetailInfo.list[index] as any
    if (item?.isAlistFolder && listDetailInfo.source === 'alist') {
      navigations.pushSonglistDetailScreen(componentId, {
        id: item.meta.songId,
        name: item.name,
        author: '',
        img: item.meta.picUrl ?? null,
        source: 'alist',
      })
      return
    }
    if (item?.isAlistVideo && listDetailInfo.source === 'alist') {
      void (async() => {
        try {
          const { promise } = musicSdk.alist.getMusicUrl(toOldMusicInfo(item) as any, '128k')
          const { url } = await promise
          if (!url) {
            toast('无法获取视频直链')
            return
          }
          showVideoPlayer({
            url,
            title: item.name,
            artist: item.singer || undefined,
            list: listDetailInfo.list,
            index,
          })
        } catch (err) {
          toast('打开视频失败：' + ((err as any)?.message || err))
        }
      })()
      return
    }
    // [二开] TVBox 视频条目（如爱听音乐 MV，isVideo 由 tvbox 源标记）：
    // 取直链后用内置视频播放器打开；取不到链（站方已关闭 MV 播放）给出友好提示
    if (item?.isVideo && listDetailInfo.source === 'tvbox') {
      void (async() => {
        try {
          const { promise } = musicSdk.tvbox.getMusicUrl(toOldMusicInfo(item) as any, '128k')
          const { url } = await promise
          if (!url) {
            toast('无法获取视频地址（该站可能已关闭 MV 播放）')
            return
          }
          showVideoPlayer({
            url,
            title: item.name,
            artist: item.singer || undefined,
            list: listDetailInfo.list,
            index,
          })
        } catch (err) {
          toast('打开视频失败：' + ((err as any)?.message || err))
        }
      })()
      return
    }
    void handlePlay(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list, index)
  }
  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page, true).then((listDetail) => {
      const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(result.list)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const page = songlistState.listDetailInfo.list.length ? songlistState.listDetailInfo.page + 1 : 1
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page).then((listDetail) => {
      const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(result.list, true)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
      listRef.current?.setStatus('error')
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const header = useMemo(() => <Header ref={headerRef} componentId={componentId} />, [])

  // [二开] 头部固定：Header 原来作为 ListHeaderComponent 放在 FlatList 里会随列表滚走，
  // 改为渲染在列表上方固定不动，仅歌曲列表滚动（用户要求滑动时保留头部）。
  return (
    <View style={{ flex: 1 }}>
      {header}
      <OnlineList
        ref={listRef}
        onPlayList={handlePlayList}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        // progressViewOffset={}
      />
    </View>
  )
})

