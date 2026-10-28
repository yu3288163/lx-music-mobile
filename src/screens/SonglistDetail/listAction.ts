import { createList, setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import { getListDetail, getListDetailAll } from '@/core/songlist'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'
import syncSourceList from '@/core/syncSourceList'
import { confirmDialog, toMD5, toast } from '@/utils/tools'
import { type Source } from '@/store/songlist/state'

const getListId = (id: string, source: LX.OnlineSource) => `${source}__${id}`

export const handlePlay = async(id: string, source: Source, list?: LX.Music.MusicInfoOnline[], index = 0) => {
  const listId = getListId(id, source)
  let isPlayingList = false
  if (!list?.length) list = (await getListDetail(id, source, 1)).list
  // [二开] Alist 文件夹/视频条目不可在洛雪内播放，过滤之，并把点击位置映射到过滤后下标。
  // 注意：list 为新格式（meta.qualitys），不能用旧格式字段 it.types 判断！
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isUnplayable = (it: any) => it.source === 'alist' && (!!it.isAlistFolder || !!it.isAlistVideo)
  if (source === 'alist' && list?.some(isUnplayable)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playable = (list as any[]).filter((it: any) => !isUnplayable(it))
    const cur = list[index] as any
    const pIndex = cur && !isUnplayable(cur) ? playable.indexOf(cur) : -1
    index = pIndex < 0 ? 0 : pIndex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list = playable as any
  }
  if (list?.length) {
    await setTempList(listId, [...list])
    void playList(LIST_IDS.TEMP, index)
    isPlayingList = true
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullList = source === 'alist' ? (await getListDetailAll(source, id)).filter((it: any) => !it.isAlistFolder && !it.isAlistVideo) : (await getListDetailAll(source, id))
  if (!fullList.length) return
  if (isPlayingList) {
    if (listState.tempListMeta.id == listId) {
      await setTempList(listId, [...fullList])
    }
  } else {
    await setTempList(listId, [...fullList])
    void playList(LIST_IDS.TEMP, index)
  }
}

export const handleCollect = async(id: string, source: Source, name: string) => {
  const listId = getListId(id, source)

  const targetList = listState.userList.find(l => l.sourceListId == listId)
  if (targetList) {
    const confirm = await confirmDialog({
      message: global.i18n.t('duplicate_list_tip', { name: targetList.name }),
      cancelButtonText: global.i18n.t('list_import_part_button_cancel'),
      confirmButtonText: global.i18n.t('confirm_button_text'),
    })
    if (!confirm) return
    void syncSourceList(targetList)
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = (await getListDetailAll(source, id)).filter((it: any) => source !== 'alist' || (!it.isAlistFolder && !it.isAlistVideo))
  await createList({
    name,
    id: `${source}_${toMD5(listId)}`,
    list,
    source,
    sourceListId: id,
  })
  toast(global.i18n.t('collect_success'))
}
