import type { NodeProps } from '@xyflow/react'
import type { Gender } from '@/api/core'

type PersonNodeData = {
  label: string
  gender?: Gender
  selectedA?: boolean
  selectedB?: boolean
}

export default function PersonNode(props: NodeProps) {
  const data = props.data as PersonNodeData
  const ring = data.selectedA ? 'ring-2 ring-emerald-500' : data.selectedB ? 'ring-2 ring-lime-500' : ''

  return (
    <div className={`min-w-[140px] rounded-xl border bg-card px-3 py-2 shadow-sm ${ring}`}>
      <div className="text-sm font-medium leading-tight">{data.label}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{data.gender ?? 'UNKNOWN'}</div>
    </div>
  )
}
