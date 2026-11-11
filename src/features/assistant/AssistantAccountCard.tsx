/**
 * The unit's AI account: inherited from above, its own (provider + model + key), or off for the subtree. The API
 * never returns the key — only its masked tail. A test button makes one short round-trip with the account in effect.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpFromLine, Bot, BotOff, Eye, EyeOff, KeyRound, PlugZap } from 'lucide-react'
import type { AssistantAccountMode, AssistantProvider, OrgUnit } from '@/domain'
import { repos } from '@/data'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Card, CardHeader, Field, Input, Segmented, Select, Skeleton, toast } from '@/shared/ui'
import { useAssistantAccount, useSaveAssistantAccount } from './queries'

const PROVIDERS: Exclude<AssistantProvider, 'none'>[] = ['anthropic', 'openai', 'deepseek', 'deploy', 'custom']
const PRESET_MODEL: Record<string, string> = { anthropic: 'claude-opus-5-5', openai: 'gpt-4.1', deepseek: 'deepseek-chat', deploy: 'deepseek-ai/deepseek-v4.1-flash-1017', custom: '' }
const PRESET_URL: Record<string, string> = { anthropic: '', openai: 'https://api.openai.com/v1', deepseek: 'https://api.deepseek.com', deploy: 'https://api.deploy.com/api/v1', custom: '' }
const MODES: { value: AssistantAccountMode; icon: ReactNode }[] = [
  { value: 'inherited', icon: <ArrowUpFromLine /> },
  { value: 'own', icon: <KeyRound /> },
  { value: 'off', icon: <BotOff /> },
]

export function AssistantAccountCard({ unit, readOnly }: { unit: OrgUnit; readOnly?: boolean }) {
  const { t } = useTranslation()
  return (
    <Card data-assistant-account>
      <CardHeader className="max-xs:flex-col max-xs:items-start" title={<span className="inline-flex items-center gap-2"><Bot className="size-4 text-brand" />{t('assistant.settings.accountTitle')}</span>} description={t('assistant.settings.accountSub')} />
      <Editor key={unit.id} unit={unit} readOnly={readOnly} />
    </Card>
  )
}

function Editor({ unit, readOnly }: { unit: OrgUnit; readOnly?: boolean }) {
  const { t } = useTranslation()
  const current = useAssistantAccount(unit.id)
  const save = useSaveAssistantAccount()
  const d = current.data
  const own = d?.mode === 'own'
  const [mode, setMode] = useState<AssistantAccountMode>('inherited')
  const [provider, setProvider] = useState<Exclude<AssistantProvider, 'none'>>('anthropic')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [maxTokens, setMaxTokens] = useState(2048)
  const [testing, setTesting] = useState(false)
  useEffect(() => {
    if (!d) return
    setMode(d.mode)
    if (d.mode === 'own' && d.provider !== 'none') { setProvider(d.provider); setModel(d.model ?? ''); setBaseUrl(d.baseUrl ?? '') }
    setEffort((d.effort as 'low' | 'medium' | 'high') ?? 'medium')
    setMaxTokens(d.maxTokens ?? 2048)
    setApiKey('')
  }, [d])
  const pickProvider = (p: Exclude<AssistantProvider, 'none'>) => { setProvider(p); setModel(PRESET_MODEL[p] ?? ''); setBaseUrl(PRESET_URL[p] ?? '') }
  const savedKey = own && !!d?.apiKeyMasked && d?.provider === provider
  const needsKey = mode === 'own' && !apiKey.trim() && !savedKey
  const needsUrl = mode === 'own' && provider === 'custom' && !baseUrl.trim()
  const dirty = !!d && (mode !== d.mode || (mode === 'own' && (provider !== d.provider || model !== (d.model ?? '') || baseUrl !== (d.baseUrl ?? '') || !!apiKey.trim() || effort !== (d.effort ?? 'medium') || maxTokens !== (d.maxTokens ?? 2048))))

  const submit = async () => {
    if (needsKey) { toast.error(t('assistant.settings.keyRequired')); return }
    try {
      await save.mutateAsync({ unitId: unit.id, input: mode === 'own' ? { mode, provider, model: model.trim() || undefined, baseUrl: baseUrl.trim() || undefined, apiKey: apiKey.trim() || undefined, effort, maxTokens } : { mode } })
      toast.success(t('assistant.settings.saved'))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const test = async () => {
    setTesting(true)
    try {
      const r = await repos.assistant.testAccount(unit.id)
      if (r.ok) toast.success(t('assistant.settings.testOk', { ms: r.latencyMs, reply: r.reply ?? '' }))
      else toast.error(t('assistant.settings.testFail', { error: r.error ?? '' }))
    } catch (e) { toast.error(errorMessage(e)) } finally { setTesting(false) }
  }

  if (!d) return <Skeleton className="h-40" />
  return (
    <div className="flex flex-col gap-4">
      <Segmented<AssistantAccountMode> value={mode} onChange={(v) => { if (!readOnly) setMode(v) }} wrap items={MODES.map((m) => ({ value: m.value, label: t(`assistant.settings.mode.${m.value}`), icon: m.icon }))} />
      <p className="text-[12.5px] text-ink-3">{t(`assistant.settings.modeHint.${mode}`)}</p>
      {mode === 'inherited' && (
        <div className="rounded-[var(--radius)] border border-dashed border-line bg-surface-2/50 px-3 py-2.5 text-[13px]" data-assistant-inherited>
          {d.configured && d.effectiveUnitName ? <>{t('assistant.settings.inheritedFrom', { name: d.effectiveUnitName })} <Badge size="sm" tone="brand" className="ml-1">{t(`assistant.settings.providers.${d.provider}`)}</Badge> {d.model && <span className="ml-1 font-mono text-[12px] text-ink-3">{d.model}</span>}</> : <span className="text-warn">{t('assistant.settings.nothingAbove')}</span>}
        </div>
      )}
      {mode === 'own' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('assistant.settings.provider')} hint={t('assistant.settings.providerHint')}>
            {(id) => (
              <Select id={id} value={provider} disabled={readOnly} onChange={(e) => pickProvider(e.target.value as Exclude<AssistantProvider, 'none'>)} data-assistant-provider>
                {PROVIDERS.map((p) => <option key={p} value={p}>{t(`assistant.settings.providers.${p}`)}</option>)}
              </Select>
            )}
          </Field>
          <Field label={t('assistant.settings.model')} hint={t('assistant.settings.modelHint')}>
            {(id) => <Input id={id} mono value={model} disabled={readOnly} placeholder={PRESET_MODEL[provider] || 'model-id'} onChange={(e) => setModel(e.target.value)} data-assistant-model />}
          </Field>
          {provider !== 'anthropic' && (
            <Field label={t('assistant.settings.baseUrl')} hint={t('assistant.settings.baseUrlHint')} required={provider === 'custom'} error={needsUrl && t('common.required')} className="sm:col-span-2">
              {(id) => <Input id={id} mono value={baseUrl} disabled={readOnly} placeholder={PRESET_URL[provider] || 'https://…/v1'} onChange={(e) => setBaseUrl(e.target.value)} invalid={needsUrl} />}
            </Field>
          )}
          <Field label={t('assistant.settings.apiKey')} hint={savedKey ? t('assistant.settings.apiKeySaved', { masked: d.apiKeyMasked }) : t('assistant.settings.apiKeyHint')} required={!savedKey} className="sm:col-span-2">
            {(id) => (
              <Input id={id} mono type={showKey ? 'text' : 'password'} value={apiKey} disabled={readOnly} autoComplete="off" placeholder={savedKey ? '••••••••' : 'sk-…'} onChange={(e) => setApiKey(e.target.value)} data-assistant-key
                rightSlot={<button type="button" onClick={() => setShowKey((v) => !v)} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="toggle">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
            )}
          </Field>
          {provider === 'anthropic' && (
            <Field label={t('assistant.settings.effort')} hint={t('assistant.settings.effortHint')}>
              {(id) => <Select id={id} value={effort} disabled={readOnly} onChange={(e) => setEffort(e.target.value as 'low' | 'medium' | 'high')}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></Select>}
            </Field>
          )}
          <Field label={t('assistant.settings.maxTokens')}>
            {(id) => <Input id={id} type="number" min={256} max={32000} step={256} value={maxTokens} disabled={readOnly} onChange={(e) => setMaxTokens(Math.max(256, Math.min(32000, Number(e.target.value) || 2048)))} />}
          </Field>
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button onClick={() => void submit()} loading={save.isPending} disabled={!dirty || needsUrl} data-assistant-save>{t('assistant.settings.save')}</Button>
          <Button variant="secondary" leftIcon={<PlugZap className="size-4" />} onClick={() => void test()} loading={testing} disabled={!d.configured || dirty} data-assistant-test>{t('assistant.settings.test')}</Button>
        </div>
      )}
    </div>
  )
}
