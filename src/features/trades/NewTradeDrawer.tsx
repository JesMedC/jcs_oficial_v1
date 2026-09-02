/*
 * portal-fase0a-base — NewTradeDrawer.
 *
 * Right-side glass drawer that hosts the NewTradeForm. Opens when
 * useNewTradeDrawer.isOpen is true; closes (a) on success, (b) on
 * back/escape, or (c) when the user cancels. While the mutation is
 * pending a soft spinner overlays the form.
 */
import { GlassDrawer } from '../../components/common/GlassDrawer';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import { NewTradeForm } from './NewTradeForm';

export function NewTradeDrawer() {
  const isOpen = useNewTradeDrawer((state) => state.isOpen);
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
      <NewTradeForm onSuccess={close} onError={() => undefined} />
    </GlassDrawer>
  );
}
