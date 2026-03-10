import { Component, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { PlayerService } from '../../../services/player.service';
import { GoalieService } from '../../../services/goalie.service';
import { ToastService } from '../../../services/toast.service';
import {
  TryoutEntry,
  TryoutEntryType,
  TryoutTabType,
  TryoutStatus,
} from '../../interfaces/tryout.interface';
import { Player } from '../../interfaces/player.interface';
import { Goalie } from '../../interfaces/goalie.interface';
import { PositionOption } from '../../../services/position.service';
import { Team } from '../../interfaces/team.interface';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import { CustomMultiSelectComponent } from '../custom-multi-select/custom-multi-select.component';
import { SelectOptionGroup } from '../custom-select/custom-select.component';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { PlayerFormModal, PlayerFormModalData } from '../player-form-modal/player-form.modal';
import { GoalieFormModal, GoalieFormModalData } from '../goalie-form-modal/goalie-form.modal';

export interface TryoutSingleEntity {
  playerId: number;
  name: string;
  team: string;
  teamId: number | null;
  type: TryoutEntryType;
}

export interface TryoutModalData {
  activeTab: TryoutTabType;
  teamId: number | null;
  playerEntries: TryoutEntry[];
  goalieEntries: TryoutEntry[];
  positions: PositionOption[];
  teams: Team[];
  singleEntity?: TryoutSingleEntity;
}

export interface TryoutModalResult {
  selectedIds: number[];
  type: TryoutEntryType;
  teamId: number | null;
  note: string;
}

@Component({
  selector: 'app-tryout-modal',
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    ButtonSmallComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
    CardGridComponent,
    CardGridItemComponent,
    CustomMultiSelectComponent,
    CustomSelectComponent,
  ],
  templateUrl: './tryout.modal.html',
  styleUrl: './tryout.modal.scss',
})
export class TryoutModal {
  private router = inject(Router);
  private modalService = inject(ModalService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private toast = inject(ToastService);
  data = inject(ModalService).getModalData<TryoutModalData>();

  private playerEntries = signal<TryoutEntry[]>(this.data.playerEntries);
  private goalieEntries = signal<TryoutEntry[]>(this.data.goalieEntries);
  selectedIds = signal<string[]>([]);
  isSubmitting = signal(false);
  teamOptions = signal<SelectOption[]>([
    { value: '', label: 'No Team' },
    ...this.data.teams.map((t) => ({ value: t.id, label: t.name })),
  ]);
  selectedTeamId = signal<string>(this.data.teamId ? String(this.data.teamId) : '');
  showTeamSelect = !this.data.teamId;
  selectedType = signal<TryoutEntryType>(
    this.data.activeTab === 'all' ? 'player' : this.data.activeTab
  );
  note = signal('');

  isSingleMode = !!this.data.singleEntity;
  isAllTab = this.data.activeTab === 'all';
  selectedStringIds = computed(() => this.selectedIds());

  allEntries = computed(() =>
    this.selectedType() === 'goalie' ? this.goalieEntries() : this.playerEntries()
  );

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

  get isGoalie(): boolean {
    return this.selectedType() === 'goalie';
  }

  constructor() {
    this.modalService.registerDirtyCheck(() =>
      this.isSingleMode
        ? this.note().length > 0
        : this.selectedIds().length > 0 || this.note().length > 0
    );
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });

    if (this.isSingleMode && this.data.singleEntity) {
      this.selectedType.set(this.data.singleEntity.type);
    }

    if (this.showTeamSelect && !this.selectedTeamId()) {
      this.selectedTeamId.set('');
    }
  }

  onSelectionChange(ids: string[]): void {
    this.selectedIds.set(ids);
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  onTypeChange(type: TryoutEntryType): void {
    if (type === this.selectedType()) return;
    this.selectedType.set(type);
    this.selectedIds.set([]);
  }

  onSubmitSelected(): void {
    if (this.isSingleMode) {
      this.onSubmitSingle();
      return;
    }

    const entries = this.selectedEntries();
    if (!entries.length) return;

    this.isSubmitting.set(true);
    const selectedPlayerIds = entries.map((e) => parseInt(e.playerId, 10));
    const result: TryoutModalResult = {
      selectedIds: selectedPlayerIds,
      type: this.selectedType(),
      teamId: this.resolvedTeamId,
      note: this.note(),
    };
    this.modalService.closeWithDataProcessing(result);
  }

  onSubmitSingle(): void {
    if (!this.data.singleEntity) return;

    this.isSubmitting.set(true);
    const result: TryoutModalResult = {
      selectedIds: [this.data.singleEntity.playerId],
      type: this.data.singleEntity.type,
      teamId: this.resolvedTeamId,
      note: this.note(),
    };
    this.modalService.closeWithDataProcessing(result);
  }

  openCreateModal(): void {
    if (this.isGoalie) {
      this.modalService.openModal(GoalieFormModal, {
        name: 'Create Goalie',
        icon: 'sports_hockey',
        width: '900px',
        maxWidth: '95vw',
        data: {
          isEditMode: false,
          positions: this.data.positions,
          teams: this.data.teams,
        } as GoalieFormModalData,
        onCloseWithDataProcessing: (result: Partial<Goalie>) => {
          this.goalieService.addGoalie(result).subscribe({
            next: (newGoalie) => {
              this.toast.show('Goalie created successfully', 'success');
              this.modalService.closeModal();
              const entry = this.goalieToEntry(newGoalie);
              this.goalieEntries.update((entries) => [entry, ...entries]);
              this.selectedIds.update((ids) => [...ids, String(newGoalie.id)]);
            },
            error: () => {
              this.toast.show('Failed to create goalie', 'error');
              this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
            },
          });
        },
      });
    } else {
      this.modalService.openModal(PlayerFormModal, {
        name: 'Create Player',
        icon: 'sports_hockey',
        width: '900px',
        maxWidth: '95vw',
        data: {
          isEditMode: false,
          positions: this.data.positions,
          teams: this.data.teams,
        } as PlayerFormModalData,
        onCloseWithDataProcessing: (result: Partial<Player>) => {
          this.playerService.addPlayer(result).subscribe({
            next: (newPlayer) => {
              this.toast.show('Player created successfully', 'success');
              this.modalService.closeModal();
              const entry = this.playerToEntry(newPlayer);
              this.playerEntries.update((entries) => [entry, ...entries]);
              this.selectedIds.update((ids) => [...ids, String(newPlayer.id)]);
            },
            error: () => {
              this.toast.show('Failed to create player', 'error');
              this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
            },
          });
        },
      });
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  onTeamChange(teamId: string): void {
    this.selectedTeamId.set(teamId);
  }

  profileRoute = computed(() => {
    const entity = this.data.singleEntity;
    if (!entity) return null;
    const segment = entity.type === 'goalie' ? 'goalies' : 'players';
    return `/teams-and-rosters/${segment}/${entity.playerId}/profile`;
  });

  teamRoute = computed(() => {
    const entity = this.data.singleEntity;
    if (!entity?.teamId) return null;
    return `/teams-and-rosters/teams/${entity.teamId}/profile`;
  });

  closeModals(): void {
    this.modalService.closeAll();
  }

  goToProfile(): void {
    const route = this.profileRoute();
    if (!route) return;
    this.modalService.closeAll();
    this.router.navigate([route]);
  }

  goToTeam(): void {
    const route = this.teamRoute();
    if (!route) return;
    this.modalService.closeAll();
    this.router.navigate([route]);
  }

  private get resolvedTeamId(): number | null {
    if (this.data.teamId) return this.data.teamId;
    const selected = this.selectedTeamId();
    return selected && selected !== '' ? parseInt(selected, 10) : null;
  }

  private playerToEntry(player: Player): TryoutEntry {
    return {
      id: player.id,
      tryoutId: 0,
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
      status: TryoutStatus.TryingOut,
      hasAnalytics: false,
      note: null,
      userId: null,
      changedBy: null,
      changedAt: null,
    };
  }

  private goalieToEntry(goalie: Goalie): TryoutEntry {
    return {
      id: goalie.id,
      tryoutId: 0,
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
      status: TryoutStatus.TryingOut,
      hasAnalytics: false,
      note: null,
      userId: null,
      changedBy: null,
      changedAt: null,
    };
  }
}
