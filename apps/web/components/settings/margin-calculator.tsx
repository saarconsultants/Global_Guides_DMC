'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Calculator } from 'lucide-react';

interface Props {
  defaultMarkupPct: number;
  overrides: Record<string, number>;
}

const PRODUCTS = [
  { key: 'FLIGHT', label: 'Flights' },
  { key: 'HOTEL', label: 'Hotels' },
  { key: 'TRANSFER', label: 'Transfers' },
  { key: 'ACTIVITY', label: 'Activities' },
  { key: 'VISA', label: 'Visa' },
  { key: 'INSURANCE', label: 'Insurance' },
];

export function MarginCalculator({ defaultMarkupPct, overrides }: Props) {
  const [netInr, setNetInr] = useState('100000');
  const [product, setProduct] = useState('HOTEL');

  const { effectivePct, customerTotal, margin } = useMemo(() => {
    const net = Math.max(0, parseFloat(netInr) || 0);
    const pct = overrides[product] ?? defaultMarkupPct;
    const total = Math.round(net * (1 + pct / 100));
    return { effectivePct: pct, customerTotal: total, margin: total - net };
  }, [netInr, product, defaultMarkupPct, overrides]);

  const fmt = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2">
          <Calculator className="w-4 h-4 text-crimson-700" />Live margin calculator
        </h2>
        <p className="text-xs text-[rgb(var(--text-secondary))]">
          Paste a net supplier cost and pick a product to see what the customer pays — using your current saved settings above. Changes here aren't persisted; this is a what-if tool.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Net supplier cost (₹)</Label>
            <Input type="number" min={0} step={100} value={netInr} onChange={(e) => setNetInr(e.target.value)} />
          </div>
          <div>
            <Label>Product type</Label>
            <select value={product} onChange={(e) => setProduct(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              {PRODUCTS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-md border border-border-subtle bg-surface-2 p-4 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Markup applied</p>
            <p className="font-mono text-lg font-bold text-navy-900 mt-1">{effectivePct}%</p>
            <p className="text-[10px] text-[rgb(var(--text-tertiary))] mt-0.5">{overrides[product] != null ? 'override' : 'default'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Your margin</p>
            <p className="font-mono text-lg font-bold text-success-500 mt-1">{fmt(margin)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Customer total</p>
            <p className="font-mono text-lg font-bold text-crimson-900 mt-1">{fmt(customerTotal)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
