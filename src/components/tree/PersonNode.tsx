import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { Gender } from "@/api/core";

type PersonNodeData = {
  label: string;
  gender?: Gender;
  selectedA?: boolean;
  selectedB?: boolean;
  isMe?: boolean;
};

export default function PersonNode(props: NodeProps) {
  const data = props.data as PersonNodeData;
  const ring = data.isMe
    ? "ring-4 ring-yellow-400"
    : data.selectedA
      ? "ring-2 ring-emerald-500"
      : data.selectedB
        ? "ring-2 ring-lime-500"
        : "";

  const theme =
    data.gender === "MALE"
      ? "border-sky-200 bg-white"
      : data.gender === "FEMALE"
        ? "border-fuchsia-200 bg-white"
        : "border-amber-200 bg-white";

  const badgeColor =
    data.gender === "MALE"
      ? "bg-sky-500"
      : data.gender === "FEMALE"
        ? "bg-fuchsia-500"
        : "bg-amber-500";

  return (
    <div
      className={`min-w-[170px] rounded-xl border-2 px-4 py-3 shadow-md transition-shadow hover:shadow-lg ${theme} ${ring} relative`}
    >
      {/* Parent connections (vertical) */}
      <Handle
        id="parent-top"
        type="target"
        position={Position.Top}
        style={{ background: "#10b981" }}
      />
      <Handle
        id="parent-bottom"
        type="source"
        position={Position.Bottom}
        style={{ background: "#10b981" }}
      />

      {/* Sibling connections (horizontal - left) */}
      <Handle
        id="sibling-left"
        type="source"
        position={Position.Left}
        style={{ background: "#6366f1" }}
      />
      <Handle
        id="sibling-left-target"
        type="target"
        position={Position.Left}
        style={{ background: "#6366f1" }}
      />
      <Handle
        id="sibling-right-target"
        type="target"
        position={Position.Right}
        style={{ background: "#6366f1" }}
      />

      {/* Spouse connections (horizontal - right to left) */}
      <Handle
        id="spouse-right"
        type="source"
        position={Position.Right}
        style={{ background: "#ec4899" }}
      />
      <Handle
        id="spouse-left"
        type="target"
        position={Position.Left}
        style={{ background: "#ec4899" }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-semibold leading-tight text-gray-900">
          {data.label}
        </div>
        <div className="flex items-center gap-1.5">
          {data.isMe && (
            <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
              Me
            </div>
          )}
          <div
            className={`h-3 w-3 rounded-full ${badgeColor} flex-shrink-0 mt-0.5`}
          />
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 uppercase tracking-wide">
        {data.gender ?? "UNKNOWN"}
      </div>
    </div>
  );
}
