import { officialAccounts, type OfficialAccount } from '../../data/officialAccounts'
import Badge from '../ui/Badge'

export default function OfficialAvatar({ account, large = false }: { account: OfficialAccount; large?: boolean }) {
  return <span className={`official-avatar official-avatar--${account}${large ? ' official-avatar--large' : ''}`} aria-hidden="true">{account === 'imperafc' ? <Badge size={large ? 72 : 30} /> : officialAccounts[account].initials}</span>
}
