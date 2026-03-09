import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  forwardRef,
  inject,
  ElementRef,
  viewChild,
  effect,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CdkOverlayOrigin, CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { SelectOption, SelectOptionGroup } from '../custom-select/custom-select.component';

@Component({
  selector: 'app-custom-multi-select',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './custom-multi-select.component.html',
  styleUrl: './custom-multi-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomMultiSelectComponent),
      multi: true,
    },
  ],
})
export class CustomMultiSelectComponent implements ControlValueAccessor {
  optionGroups = input<SelectOptionGroup[]>([]);
  placeholder = input('');
  searchPlaceholder = input('Search...');
  value = input<string[]>([]);

  valueChange = output<string[]>();

  isOpen = signal(false);
  searchText = signal('');
  values = signal<string[]>([]);
  isDisabled = signal(false);
  panelMinWidth = signal(0);

  private el = inject(ElementRef);
  private cdkOverlay = viewChild(CdkConnectedOverlay);
  private usingCva = false;

  readonly dropdownPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  ];

  constructor() {
    effect(() => {
      if (!this.usingCva) {
        this.values.set(this.value());
      }
    });
  }

  filteredGroups = computed(() => {
    const groups = this.optionGroups();
    const search = this.searchText().toLowerCase();
    if (!search) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(search) ||
            (o.prefix && o.prefix.toLowerCase().includes(search))
        ),
      }))
      .filter((g) => g.options.length > 0);
  });

  selectedOptions = computed(() => {
    const selected = new Set(this.values());
    const result: SelectOption[] = [];
    for (const group of this.optionGroups()) {
      for (const opt of group.options) {
        if (selected.has(opt.value)) {
          result.push(opt);
        }
      }
    }
    return result;
  });

  hasSelection = computed(() => this.values().length > 0);

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[]): void {
    this.usingCva = true;
    this.values.set(value ?? []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  toggle(): void {
    if (this.isDisabled()) return;
    this.isOpen() ? this.close() : this.open();
  }

  open(): void {
    this.panelMinWidth.set(this.el.nativeElement.offsetWidth);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.searchText.set('');
    this.onTouched();
  }

  isSelected(value: string): boolean {
    return this.values().includes(value);
  }

  toggleOption(option: SelectOption): void {
    const current = this.values();
    const newValues = current.includes(option.value)
      ? current.filter((v) => v !== option.value)
      : [...current, option.value];
    this.updateValues(newValues);
  }

  removeChip(option: SelectOption, event: MouseEvent): void {
    event.stopPropagation();
    const newValues = this.values().filter((v) => v !== option.value);
    this.updateValues(newValues);
  }

  clearAll(event: MouseEvent): void {
    event.stopPropagation();
    this.updateValues([]);
  }

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchText.set('');
    input.value = '';
    input.focus();
  }

  onOverlayAttach(): void {
    const pane = this.cdkOverlay()?.overlayRef?.overlayElement;
    setTimeout(() => {
      pane?.querySelector<HTMLInputElement>('.select-search-input')?.focus();
    });
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  private updateValues(newValues: string[]): void {
    this.values.set(newValues);
    this.onChange(newValues);
    this.valueChange.emit(newValues);
  }
}
