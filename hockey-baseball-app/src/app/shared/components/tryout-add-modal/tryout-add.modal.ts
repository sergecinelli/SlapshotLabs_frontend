import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import { CustomMultiSelectComponent } from '../custom-multi-select/custom-multi-select.component';
import { SelectOptionGroup } from '../custom-select/custom-select.component';
import { PlayerService } from '../../../services/player.service';
import { GoalieService } from '../../../services/goalie.service';
import { TryoutEntry, TryoutTabType } from '../../interfaces/tryout.interface';
import { Player } from '../../interfaces/player.interface';
import { Goalie } from '../../interfaces/goalie.interface';
import { PositionService, PositionOption } from '../../../services/position.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { getFieldError } from '../../validators/form-error.util';

export interface TryoutAddModalData {
  activeTab: TryoutTabType;
  teamId: number;
  entries?: TryoutEntry[];
  positions?: PositionOption[];
}

@Component({
  selector: 'app-tryout-add-modal',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ButtonSmallComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
    CardGridComponent,
    CardGridItemComponent,
    CustomMultiSelectComponent,
  ],
  templateUrl: './tryout-add.modal.html',
  styleUrl: './tryout-add.modal.scss',
})
export class TryoutAddModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private positionService = inject(PositionService);
  data = inject(ModalService).getModalData<TryoutAddModalData>();

  playerForm!: FormGroup;
  allEntries = signal<TryoutEntry[]>([]);
  selectedIds = signal<string[]>([]);
  showCreateForm = signal(false);
  isSubmitting = signal(false);
  positionOptions: PositionOption[] = [];

  selectedStringIds = computed(() => this.selectedIds());

  selectedEntries = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.allEntries().filter((e) => ids.has(String(e.id)));
  });

  entryOptionGroups = computed<SelectOptionGroup[]>(() => {
    const entries = this.allEntries();
    const groups = new Map<string, TryoutEntry[]>();
    for (const entry of entries) {
      const key = entry.team || 'Unknown Team';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }
    return Array.from(groups, ([teamName, items]) => ({
      label: teamName,
      options: items.map((e) => ({
        value: String(e.id),
        label: `${e.firstName} ${e.lastName}`,
        prefix: `#${e.jerseyNumber}`,
        suffix: e.teamLevelName,
      })),
    }));
  });

  shootsOptions = [
    { value: 'Left Shot', label: 'Left Shot' },
    { value: 'Right Shot', label: 'Right Shot' },
  ];

  get isGoalie(): boolean {
    return this.data.activeTab === 'goalie';
  }

  constructor() {
    this.modalService.registerDirtyCheck(() => this.playerForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.playerForm = this.createForm();

    if (this.data.positions?.length) {
      this.applyPositions(this.data.positions);
    } else {
      this.loadPositions();
    }

    if (this.data.entries?.length) {
      this.allEntries.set(this.data.entries);
    } else {
      this.loadSearchData();
    }
  }

  onSelectionChange(ids: string[]): void {
    this.selectedIds.set(ids);
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  toggleCreateForm(): void {
    this.showCreateForm.set(!this.showCreateForm());
  }

  onSubmitSelected(): void {
    const entries = this.selectedEntries();
    if (!entries.length) return;

    this.isSubmitting.set(true);
    this.modalService.closeWithDataProcessing({ entries });
  }

  onSubmitNew(): void {
    if (this.playerForm.valid) {
      const formValue = this.playerForm.value;
      const entry: Partial<TryoutEntry> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        position: this.isGoalie ? 'Goalie' : formValue.position,
        shoots: formValue.shoots,
        jerseyNumber: formValue.jerseyNumber,
        type: this.data.activeTab,
      };

      this.isSubmitting.set(true);
      this.modalService.closeWithDataProcessing({ entries: [entry] });
    } else {
      Object.keys(this.playerForm.controls).forEach((key) => {
        this.playerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    position: 'Position',
    shoots: 'Shoots',
    jerseyNumber: 'Number',
    height: 'Height',
    weight: 'Weight',
    birthYear: 'Birth Year',
  };

  getErrorMessage(fieldName: string): string {
    const control = this.playerForm.get(fieldName);
    const label = this.fieldLabels[fieldName] || fieldName;
    return getFieldError(control, label);
  }

  private loadSearchData(): void {
    if (this.isGoalie) {
      this.goalieService.getGoalies({ excludeDefault: true }).subscribe({
        next: (data) => this.allEntries.set(data.goalies.map((g) => this.goalieToEntry(g))),
        error: (error) => console.error('Failed to load goalies:', error),
      });
    } else {
      this.playerService.getPlayers().subscribe({
        next: (data) => this.allEntries.set(data.players.map((p) => this.playerToEntry(p))),
        error: (error) => console.error('Failed to load players:', error),
      });
    }
  }

  private playerToEntry(player: Player): TryoutEntry {
    return {
      id: player.id,
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      shoots: player.shoots,
      jerseyNumber: player.jerseyNumber,
      team: player.team,
      teamId: player.teamId,
      teamLogo: player.teamLogo,
      teamAgeGroup: player.teamAgeGroup,
      teamLevelName: player.teamLevelName,
      type: 'player',
    };
  }

  private goalieToEntry(goalie: Goalie): TryoutEntry {
    return {
      id: goalie.id,
      playerId: goalie.id,
      firstName: goalie.firstName,
      lastName: goalie.lastName,
      position: goalie.position,
      shoots: goalie.shoots,
      jerseyNumber: goalie.jerseyNumber,
      team: goalie.team,
      teamId: goalie.teamId,
      teamLevelName: goalie.level,
      type: 'goalie',
    };
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      position: [''],
      shoots: [this.shootsOptions[0]?.value || ''],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      height: [''],
      weight: ['', [Validators.min(1)]],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
    });
  }

  private applyPositions(positions: PositionOption[]): void {
    this.positionOptions = positions;
    if (positions.length > 0) {
      this.playerForm.patchValue({ position: positions[0].value });
    }
  }

  private loadPositions(): void {
    this.positionService.getPositions().subscribe({
      next: (positions) => this.applyPositions(positions),
      error: (error) => console.error('Failed to load positions:', error),
    });
  }
}
