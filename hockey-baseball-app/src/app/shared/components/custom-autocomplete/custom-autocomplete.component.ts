import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  forwardRef,
  inject,
  ElementRef,
  viewChild,
  effect,
  untracked,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CdkOverlayOrigin, CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { SelectOption } from '../custom-select/custom-select.component';

@Component({
  selector: 'app-custom-autocomplete',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './custom-autocomplete.component.html',
  styleUrl: './custom-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomAutocompleteComponent),
      multi: true,
    },
  ],
})
export class CustomAutocompleteComponent implements ControlValueAccessor {
  options = input<SelectOption[]>([]);
  placeholder = input('');

  isOpen = signal(false);
  inputText = signal('');
  value = signal('');
  isDisabled = signal(false);
  panelMinWidth = signal(0);

  private el = inject(ElementRef);

  readonly dropdownPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  ];

  filteredOptions = computed(() => {
    const text = this.inputText().toLowerCase();
    const opts = this.options();
    if (!text) return opts;
    return opts.filter(
      (o) => o.label.toLowerCase().includes(text) || o.value.toLowerCase().includes(text)
    );
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const opts = this.options();
      const v = untracked(() => this.value());
      if (v && opts.length) {
        const opt = opts.find((o) => o.value === v);
        if (opt) {
          this.inputText.set(opt.label);
        }
      }
    });
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
    const opt = this.options().find((o) => o.value === value);
    this.inputText.set(opt ? opt.label : (value ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.inputText.set(text);
    this.value.set(text);
    this.onChange(text);
    if (text) {
      if (!this.isOpen()) {
        this.open();
      }
    } else {
      this.close();
    }
  }

  onFocus(): void {
    if (!this.isOpen() && this.inputText()) {
      this.open();
    }
  }

  onBlur(): void {
    setTimeout(() => {
      if (this.isOpen()) {
        this.close();
      }
      this.onTouched();
    }, 150);
  }

  selectOption(option: SelectOption): void {
    this.value.set(option.value);
    this.inputText.set(option.label);
    this.onChange(option.value);
    this.close();
  }

  open(): void {
    if (this.isDisabled()) return;
    this.panelMinWidth.set(this.el.nativeElement.offsetWidth);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}
