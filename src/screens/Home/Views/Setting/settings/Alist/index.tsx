import { memo, useCallback, useState } from 'react'
import { View, StyleSheet, Alert, Text } from 'react-native'

import InputItem, { type InputItemProps } from '../../components/InputItem'
import Section from '../../components/Section'
import Button from '../../components/Button'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { testAlistConnection, testAlistSearch, testAlistList } from '@/utils/musicSdk/alist/config'


type AlistKey = 'alist.base' | 'alist.token' | 'alist.user' | 'alist.pass' | 'alist.root'

const updateAlistSetting = (key: AlistKey, value: string) => {
  updateSetting({ [key]: value } as Partial<LX.AppSetting>)
}

const Field = memo(({
  labelKey,
  settingKey,
  placeholderKey,
  secure = false,
  keyboardType = 'default',
}: {
  labelKey: string
  settingKey: AlistKey
  placeholderKey?: string
  secure?: boolean
  keyboardType?: 'default' | 'url'
}) => {
  const t = useI18n()
  const value = useSettingValue(settingKey)

  const onChanged: InputItemProps['onChanged'] = useCallback((text, callback) => {
    callback(text)
    updateAlistSetting(settingKey, text)
  }, [settingKey])

  return (
    <InputItem
      value={value}
      label={t(labelKey)}
      placeholder={placeholderKey ? t(placeholderKey) : ''}
      onChanged={onChanged}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
    />
  )
})

const pretty = (obj: unknown) => {
  try {
    return JSON.stringify(obj, null, 2).slice(0, 1800)
  } catch {
    return String(obj).slice(0, 1800)
  }
}

export default memo(() => {
  const t = useI18n()
  const [lastDebug, setLastDebug] = useState('')

  const handleTest = useCallback(async() => {
    const result = await testAlistConnection()
    Alert.alert(result.ok ? '连接成功' : '连接失败', result.message)
  }, [])

  const handleTestSearch = useCallback(async() => {
    const result = await testAlistSearch('爱')
    setLastDebug(`[搜索测试] ok=${result.ok}\n${pretty(result.data)}`)
    Alert.alert(result.ok ? '搜索返回' : '搜索失败', pretty(result.data))
  }, [])

  const handleTestList = useCallback(async() => {
    const result = await testAlistList()
    setLastDebug(`[列目录测试] ok=${result.ok}\n${pretty(result.data)}`)
    Alert.alert(result.ok ? '列目录返回' : '列目录失败', pretty(result.data))
  }, [])

  return (
    <Section title={t('setting_alist')}>
      <View style={styles.container}>
        <Field
          labelKey="setting_alist_base"
          settingKey="alist.base"
          placeholderKey="setting_alist_base_placeholder"
          keyboardType="url"
        />
        <Field
          labelKey="setting_alist_token"
          settingKey="alist.token"
          placeholderKey="setting_alist_token_placeholder"
        />
        <Field
          labelKey="setting_alist_user"
          settingKey="alist.user"
          placeholderKey="setting_alist_user_placeholder"
        />
        <Field
          labelKey="setting_alist_pass"
          settingKey="alist.pass"
          placeholderKey="setting_alist_pass_placeholder"
          secure
        />
        <Field
          labelKey="setting_alist_root"
          settingKey="alist.root"
          placeholderKey="setting_alist_root_placeholder"
        />
        <View style={styles.btnRow}>
          <Button onPress={handleTest}>{t('setting_alist_test')}</Button>
          <View style={styles.btnGap} />
          <Button onPress={handleTestSearch}>{t('setting_alist_test_search')}</Button>
          <View style={styles.btnGap} />
          <Button onPress={handleTestList}>{t('setting_alist_test_list')}</Button>
        </View>
        {lastDebug ? (
          <View style={styles.debugBox}>
            <Text style={styles.debugText} selectable>{lastDebug}</Text>
          </View>
        ) : null}
      </View>
    </Section>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 15,
    flexWrap: 'wrap',
  },
  btnGap: {
    width: 10,
  },
  debugBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
  },
})
