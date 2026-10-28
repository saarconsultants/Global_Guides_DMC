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
        // Phone: city gets the full row, nights sits under it. sm+: one row.
        'grid grid-cols-[22px_26px_minmax(0,1fr)_28px] sm:grid-cols-[28px_30px_minmax(0,1fr)_130px_28px] items-center gap-x-1.5 gap-y-1.5 sm:gap-2 py-1.5',
        isDragging && 'bg-surface rounded-md shadow-lg border border-crimson-200',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="col-start-1 row-start-1 text-[rgb(var(--text-tertiary))] cursor-grab active:cursor-grabbing touch-none w-7 h-7 inline-flex items-center justify-center rounded hover:bg-navy-50"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="col-start-2 row-start-1 w-7 h-7 inline-flex items-center justify-center rounded-[6px] bg-ink text-white font-mono text-[12px] font-bold tnum">{index + 1}</span>
      <div className="col-start-3 row-start-1 min-w-0"><CityCombobox value={cityCode} onChange={onChangeCity} disabledCodes={disabledCodes} placeholder="Pick destination" /></div>
      <select aria-label={`Nights in destination ${index + 1}`} value={nights} onChange={(e) => onChangeNights(parseInt(e.target.value, 10))} className="control col-start-3 row-start-2 sm:col-start-4 sm:row-start-1 px-3 sm:px-3.5">
        {[1,2,3,4,5,6,7,10,14].map((n) => <option key={n} value={n}>{n} night{n !== 1 ? 's' : ''}</option>)}
      </select>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove destination"
        className="col-start-4 row-start-1 sm:col-start-5 text-[rgb(var(--text-tertiary))] hover:text-danger-500 disabled:opacity-30 disabled:cursor-not-allowed w-7 h-7 inline-flex items-center justify-center rounded hover:bg-danger-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
