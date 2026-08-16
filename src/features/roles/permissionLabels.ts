import type { TFunction } from 'i18next'
import type { Permission, PermissionModule } from '@/domain'

/** Human label for a permission key, e.g. 'lab.result.write' → t('admin.perms.lab_result_write'). */
export const permissionLabel = (t: TFunction, key: Permission): string => t(`admin.perms.${key.replace(/\./g, '_')}`)

/** Human label for a permission module, e.g. 'lab' → t('admin.perms.mod_lab'). */
export const moduleLabel = (t: TFunction, mod: PermissionModule): string => t(`admin.perms.mod_${mod}`)

export const MODULE_ORDER: PermissionModule[] = ['reception', 'lab', 'confirm', 'reports', 'messaging', 'admin', 'platform']
