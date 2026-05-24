import {memo} from 'react';
import BottomSheetModal from './BottomSheetModal';
import {TimePickerContent} from './TimePickerContent';

export type TimePickerBottomSheetProps = {
  visible: boolean;
  title: string;
  /** `HH:mm` — used each time the sheet opens */
  initialHHmm: string;
  onClose: () => void;
  onConfirm: (hhmm: string) => void;
};

function TimePickerBottomSheetInner({
  visible,
  title,
  initialHHmm,
  onClose,
  onConfirm,
}: TimePickerBottomSheetProps) {
  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={title} maxHeight={500}>
      <TimePickerContent
        active={visible}
        initialHHmm={initialHHmm}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </BottomSheetModal>
  );
}

export default memo(TimePickerBottomSheetInner);

TimePickerBottomSheetInner.displayName = 'TimePickerBottomSheet';
