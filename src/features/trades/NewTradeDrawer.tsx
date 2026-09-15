/*
 * portal-fase0a-base — NewTradeDrawer.
 *
 * Right-side glass drawer that hosts the NewTradeForm. Opens when
 * useNewTradeDrawer.isOpen is true; closes (a) on success, (b) on
 * back/escape, or (c) when the user cancels. While the mutation is
 * pending a soft spinner overlays the form.
 *
 * Scanner integration: the Market Analyzer Bot's "Cargar en
 * Diario" CTA calls ``useNewTradeDrawer.openWithPrefill({...})``
 * which sets ``isOpen`` and ``prefill`` in one shot. We forward
 * ``prefill`` to ``NewTradeForm`` which uses it to seed the
 * defaultValues + the discriminated-union direction sync on mount.
 */
import { GlassDrawer } from '../../components/common/GlassDrawer';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import { NewTradeForm } from './NewTradeForm';

export function NewTradeDrawer() {
  const isOpen = useNewTradeDrawer((state) => state.isOpen);
  const prefill = useNewTradeDrawer((state) => state.prefill);
  const close = useNewTradeDrawer((state) => state.close);

  return (
    <GlassDrawer
      open={isOpen}
      onClose={close}
      side="right"
      maxWidth="md"
      variant="default"
      title="Nuevo trade"
    >
      <NewTradeForm onSuccess={close} onError={() => undefined} prefill={prefill} />
    </GlassDrawer>
  );
}
