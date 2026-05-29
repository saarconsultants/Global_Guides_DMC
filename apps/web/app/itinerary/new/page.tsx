'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { composeItinerary } from '@/lib/itinerary/compose';
import { useItineraryStore } from '@/lib/itinerary/store';
import { findCity } from '@/lib/cities';
import type { IntakeForm, StarRating, Room } from '@/lib/itinerary/types';
import { AiSuggestModal } from '@/components/itinerary/ai-suggest-modal';
import { SortableDestinationRow } from '@/components/itinerary/sortable-destination-row';
import { Sparkles, Plus, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface DestRow { id: string; cityCode: string; nights: number }
let _idCounter = 0;
const newId = () => `d${++_idCounter}`;

export default function NewItineraryPage() {
  const router = useRouter();
  const upsert = useItineraryStore((s) => s.upsert);

  const [destinations, setDestinations] = useState<DestRow[]>([
    { id: newId(), cityCode: 'PAR', nights: 3 },
    { id: newId(), cityCode: 'AMS', nights: 2 },
  ]);
  const [leavingFromName, setLeavingFromName] = useState('Pune');
  const [nationality, setNationality] = useState('IN');
  const [departureDate, setDepartureDate] = useState(defaultDate());
  const [rooms, setRooms] = useState<Room[]>([{ adults: 2, children: 0 }]);
  const [starRating, setStarRating] = useState<StarRating | undefined>(4);
  const [addTransfers, setAddTransfers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addDest() {
    setDestinations((d) => {
      const taken = new Set(d.map((x) => x.cityCode));
      const next = ['ROM','BCN','LON','DXB','BKK','SIN','MLE','ZRH','BER','LIS'].find((c) => !taken.has(c)) ?? 'PAR';
      return [...d, { id: newId(), cityCode: next, nights: 2 }];
    });
  }
  function removeDest(id: string) { setDestinations((d) => d.length > 1 ? d.filter((x) => x.id !== id) : d); }
  function updateDest(id: string, patch: Partial<DestRow>) { setDestinations((d) => d.map((x) => x.id === id ? { ...x, ...patch } : x)); }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDestinations((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function updateRoom(i: number, patch: Partial<Room>) { setRooms((rs) => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r)); }
  function addRoom() { setRooms((rs) => rs.length < 5 ? [...rs, { adults: 1, children: 0 }] : rs); }
  function removeRoom(i: number) { setRooms((rs) => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (destinations.length === 0) { setError('Please add at least one destination.'); return; }
    if (!departureDate) { setError('Please pick a departure date.'); return; }
    const totalAdults = rooms.reduce((s, r) => s + r.adults, 0);
    if (totalAdults < 1) { setError('At least 1 adult required.'); return; }

    const intake: IntakeForm = {
      destinations: destinations.map((d) => {
        const c = findCity(d.cityCode);
        return { cityCode: d.cityCode, cityName: c?.name ?? d.cityCode, countryCode: c?.countryCode ?? '', nights: d.nights };
      }),
      leavingFromCode: '',
      leavingFromName,
      nationality, departureDate, rooms, starRating, addTransfers,
    };
    const itin = composeItinerary(intake);
    upsert(itin);
    router.push(`/itinerary/${itin.id}/customize`);
  }

  const totalNights = destinations.reduce((s, d) => s + d.nights, 0);
  const usedCodes = destinations.map((d) => d.cityCode);

  return (
    <div className="ambient">
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-crimson-700 font-bold">Step 1 of 2</p>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight mt-1">Create your trip</h1>
        <p className="text-sm text-[rgb(var(--text-secondary))] mt-1.5">Tell us where they're going. We'll handle hotels, transfers, and the day-by-day plan.</p>
      </div>

      <form onSubmit={submit}>
      <Card>
        <CardContent className="pt-6 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Destinations</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">Drag to reorder. Search 130+ cities &mdash; <span className="text-success-500 font-medium">LIVE</span> tag = full hotel inventory.</p>
              </div>
              <Button variant="brick" size="sm" className="gap-1" type="button" onClick={() => setAiOpen(true)}>
                <Sparkles className="w-3.5 h-3.5" />Suggest itinerary
              </Button>
            </div>
            {aiUsed && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-crimson-900 bg-crimson-50 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3" /> Suggested by AI &mdash; adjust as needed
              </div>
            )}

            <div className="mt-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={destinations.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  {destinations.map((d, i) => (
                    <SortableDestinationRow
                      key={d.id}
                      id={d.id}
                      index={i}
                      cityCode={d.cityCode}
                      nights={d.nights}
                      disabledCodes={usedCodes}
                      onChangeCity={(c) => updateDest(d.id, { cityCode: c })}
                      onChangeNights={(n) => updateDest(d.id, { nights: n })}
                      onRemove={() => removeDest(d.id)}
                      canRemove={destinations.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button type="button" onClick={addDest} className="text-sm text-crimson-700 hover:underline cursor-pointer inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Add another city
              </button>
              <p className="text-xs text-[rgb(var(--text-secondary))]">{destinations.length} city · {totalNights} night{totalNights !== 1 ? 's' : ''} total</p>
            </div>
          </section>

          <hr className="border-border-subtle" />

          <section>
            <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold mb-3">Trip details</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Leaving from</Label>
                <Input value={leavingFromName} onChange={(e) => setLeavingFromName(e.target.value)} placeholder="City name" />
              </div>
              <div>
                <Label required>Nationality</Label>
                <select value={nationality} onChange={(e) => setNationality(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                  <option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="AE">United Arab Emirates</option>
                </select>
              </div>
              <div>
                <Label required>Leaving on</Label>
                <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <Label>Star rating</Label>
                <select value={starRating ?? ''} onChange={(e) => setStarRating(e.target.value ? Number(e.target.value) as StarRating : undefined)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                  <option value="">Any</option><option value="3">3 Star</option><option value="4">4 Star</option><option value="5">5 Star</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label required>Travellers</Label>
                <div className="space-y-2 mt-1">
                  {rooms.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_24px] items-center gap-3 px-3 py-2 bg-surface-2 rounded-md">
                      <span className="text-xs text-[rgb(var(--text-secondary))]">Room {i + 1}</span>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-xs text-[rgb(var(--text-secondary))]">Adults</span>
                        <Stepper2 value={r.adults} min={1} onChange={(v) => updateRoom(i, { adults: v })} />
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-xs text-[rgb(var(--text-secondary))]">Children</span>
                        <Stepper2 value={r.children} min={0} max={4} onChange={(v) => updateRoom(i, { children: v })} />
                      </div>
                      <button type="button" onClick={() => removeRoom(i)} className="text-[rgb(var(--text-tertiary))] hover:text-danger-500" aria-label="Remove room">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {rooms.length < 5 && <button type="button" onClick={addRoom} className="text-sm text-crimson-700 hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add room</button>}
                </div>
              </div>
              <label className="self-end inline-flex items-center gap-2 text-sm pb-2.5 cursor-pointer">
                <input type="checkbox" checked={addTransfers} onChange={(e) => setAddTransfers(e.target.checked)} />
                Add transfers
              </label>
            </div>
          </section>

          {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}

          <div className="flex justify-end pt-2"><Button type="submit">Create proposal</Button></div>
        </CardContent>
      </Card>
      </form>

      <AiSuggestModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={(cities) => {
          setDestinations(cities.map((c) => ({ id: newId(), cityCode: c.cityCode, nights: c.nights })));
          setAiUsed(true);
        }}
      />
    </div>
    </div>
  );
}

function Stepper2({ value, onChange, min = 0, max = 9 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center bg-surface rounded border border-border">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-7 h-7 inline-flex items-center justify-center hover:bg-navy-50 cursor-pointer disabled:opacity-30" disabled={value <= min}>−</button>
      <span className="w-6 text-center font-mono text-sm tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-7 h-7 inline-flex items-center justify-center hover:bg-navy-50 cursor-pointer disabled:opacity-30" disabled={value >= max}>+</button>
    </div>
  );
}

function defaultDate() {
  const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
}
