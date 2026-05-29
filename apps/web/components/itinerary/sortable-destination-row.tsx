'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CityCombobox } from '@/components/ui/city-combobox';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  index: number;
  cityCode: string;
  nights: number;
  disabledCodes: string[];
  onChangeCity: (code: string) => void;
  onChangeNights: (n: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function SortableDestinationRow({ id, index, cityCode, nights, disabledCodes, onChangeCity, onChangeNights, onRemove, canRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-[28px_28px_1fr_120px_28px] items-center gap-2 py-1.5',
        isDragging && 'bg-surface rounded-md shadow-md border border-crimson-200',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-[rgb(var(--text-tertiary))] cursor-grab active:cursor-grabbing touch-none w-7 h-7 inline-flex items-center justify-center rounded hover:bg-navy-50"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-crimson-50 text-crimson-700 text-xs font-bold">{index + 1}</span>
      <CityCombobox value={cityCode} onChange={onChangeCity} disabledCodes={disabledCodes} placeholder="Pick destination" />
      <select value={nights} onChange={(e) => onChangeNights(parseInt(e.target.value, 10))} className="h-10 rounded-sm border border-border bg-surface px-2 text-sm">
        {[1,2,3,4,5,6,7,10,14].map((n) => <option key={n} value={n}>{n} night{n !== 1 ? 's' : ''}</option>)}
      </select>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove destination"
        className="text-[rgb(var(--text-tertiary))] hover:text-danger-500 disabled:opacity-30 disabled:cursor-not-allowed w-7 h-7 inline-flex items-center justify-center rounded hover:bg-danger-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
