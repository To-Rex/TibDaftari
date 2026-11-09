/**
 * The unit's Telegram bot: its own bot (a token from @BotFather, validated by the backend against `getMe`), the bot
 * of an ancestor, or the platform bot. Patients of this unit and the units under it talk to the effective bot.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpFromLine, Bot, Eye, EyeOff, KeyRound, Unplug } from 'lucide-react'
import type { OrgUnit } from '@/domain'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, toast } from '@/shared/ui'
import { useSetUnitTelegram } from './queries'

export function TelegramCard({ unit, readOnly }: { unit: OrgUnit; readOnly?: boolean }) {
  const { t } = useTranslation()
  const set = useSetUnitTelegram()
  const tg = unit.telegram
  const [token, setToken] = useState('')
  const [show, setShow] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const K = 'admin.unit.telegram'

  const connect = async () => {
    const v = token.trim()
    if (!v) return
    try {
      await set.mutateAsync({ unitId: unit.id, botToken: v })
      setToken('')
      toast.success(t(`${K}.saved`))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const disconnect = async () => {
    try {
      await set.mutateAsync({ unitId: unit.id, botToken: null })
      setConfirm(false)
      toast.success(t(`${K}.disconnected`))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const status = !tg ? null
    : !tg.connected ? <Badge tone="neutral" dot>{t(`${K}.notConnected`)}</Badge>
    : tg.own ? <Badge tone="ok" dot>{t(`${K}.own`)}{tg.botUsername ? ` · @${tg.botUsername}` : ''}</Badge>
    : tg.effectiveUnitId ? <Badge tone="brand" dot>{t(`${K}.inherited`)}{tg.botUsername ? ` · @${tg.botUsername}` : ''}</Badge>
    : <Badge tone="info" dot>{t(`${K}.platform`)}{tg.botUsername ? ` · @${tg.botUsername}` : ''}</Badge>
  const hint = !tg || !tg.connected ? t(`${K}.hintNone`) : tg.own ? t(`${K}.hintOwn`) : tg.effectiveUnitId ? t(`${K}.hintInherited`) : t(`${K}.hintPlatform`)

  return (
    <Card data-unit-telegram>
      <CardHeader className="max-xs:flex-col max-xs:items-start" title={t(`${K}.title`)} description={t(`${K}.subtitle`)} actions={status} />
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-line bg-surface-2/40 p-3.5 text-[13px] text-ink-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info [&>svg]:size-4">{tg?.own ? <Bot /> : <ArrowUpFromLine />}</span>
          <p className="min-w-0 leading-relaxed" data-telegram-hint>{hint}</p>
        </div>
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
          <Field label={t(`${K}.token`)} hint={t(`${K}.tokenHint`)}>
            {(id) => (
              <div className="flex flex-wrap gap-2">
                <Input id={id} type={show ? 'text' : 'password'} mono autoComplete="off" placeholder="123456789:AAH…" leftIcon={<KeyRound />} value={token} onChange={(e) => setToken(e.target.value)} className="min-w-0 flex-1 basis-64" data-telegram-token
                  rightSlot={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'hide' : 'show'} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
                {!readOnly && <Button type="button" className="max-sm:w-full" leftIcon={<Bot className="size-4" />} loading={set.isPending && !confirm} disabled={!token.trim()} onClick={() => void connect()} data-telegram-connect>{tg?.own ? t(`${K}.replace`) : t(`${K}.connect`)}</Button>}
              </div>
            )}
          </Field>
          {!readOnly && tg?.own && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft max-sm:w-full" leftIcon={<Unplug className="size-4" />} onClick={() => setConfirm(true)} data-telegram-disconnect>{t(`${K}.disconnect`)}</Button>
            </div>
          )}
        </fieldset>
      </div>
      <ConfirmDialog open={confirm} onClose={() => !set.isPending && setConfirm(false)} onConfirm={() => void disconnect()} loading={set.isPending} danger
        title={t(`${K}.disconnect`)} description={t(`${K}.disconnectConfirm`)} confirmText={t(`${K}.disconnect`)} cancelText={t('common.cancel')} />
    </Card>
  )
}
