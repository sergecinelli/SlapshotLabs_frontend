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
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CdkOverlayOrigin, CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';

export interface SelectOption {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

@Component({
  selector: 'app-custom-select',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent implements ControlValueAccessor {
  options = input<SelectOption[]>([]);
  optionGroups = input<SelectOptionGroup[]>([]);
  placeholder = input('');
  searchable = input(false);
  searchPlaceholder = input('Search...');

  isOpen = signal(false);
  searchText = signal('');
  value = signal('');
  isDisabled = signal(false);
  panelMinWidth = signal(0);

  private el = inject(ElementRef);
  private cdkOverlay = viewChild(CdkConnectedOverlay);

  readonly dropdownPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  ];

  hasGroups = computed(() => this.optionGroups().length > 0);

  filteredOptions = computed(() => {
    const opts = this.options();
    const search = this.searchText().toLowerCase();
    if (!search) return opts;
    return opts.filter((o) => o.label.toLowerCase().includes(search));
  });

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

  selectedLabel = computed(() => {
    const v = this.value();
    if (!v) return '';
    const flat = this.options().find((o) => o.value === v);
    if (flat) return flat.label;
    for (const group of this.optionGroups()) {
      const opt = group.options.find((o) => o.value === v);
      if (opt) return opt.label;
    }
    return '';
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value.set(value ?? '');
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

  selectOption(option: SelectOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
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
    if (this.searchable()) {
      const pane = this.cdkOverlay()?.overlayRef?.overlayElement;
      setTimeout(() => {
        pane?.querySelector<HTMLInputElement>('.select-search-input')?.focus();
      });
    }
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}
