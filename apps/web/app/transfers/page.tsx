import { TransferSearch } from '@/components/transfers/transfer-search';
import { promoSrc } from '@/lib/promos';

export const dynamic = 'force-dynamic';

export default function TransfersPage() {
  return <TransferSearch heroImg={promoSrc('banner-sea.jpg')} />;
}
