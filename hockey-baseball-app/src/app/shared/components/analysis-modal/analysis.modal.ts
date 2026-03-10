import { Component, inject, signal, computed } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { Analysis, AnalysisType, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { Player } from '../../interfaces/player.interface';
import { Goalie } from '../../interfaces/goalie.interface';
import { Team } from '../../interfaces/team.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import {
  CustomSelectComponent,
  SelectOption,
  SelectOptionGroup,
} from '../custom-select/custom-select.component';
import { getFieldError } from '../../validators/form-error.util';

export type AnalysisModalMode = 'create' | 'edit' | 'view';

export interface GameOption {
  value: string;
  label: string;
}

export interface AnalysisModalData {
  mode: AnalysisModalMode;
  analysisType: AnalysisType;
  analysis?: Analysis;
  preSelectedEntityId?: string;
  players?: Player[];
  goalies?: Goalie[];
  teams?: Team[];
  games?: GameOption[];
}

export interface AnalysisModalResult {
  isEditMode: boolean;
  analysisId?: string;
  apiData: AnalyticsApiIn;
}

const ENTITY_LABELS: Record<AnalysisType, string> = {
  player: 'Player',
  goalie: 'Goalie',
  team: 'Team',
  game: 'Game',
};

const API_ID_FIELDS: Record<AnalysisType, keyof AnalyticsApiIn> = {
  player: 'player_id',
  goalie: 'player_id',
  team: 'team_id',
  game: 'game_id',
};

const PROFILE_ROUTE_SEGMENTS: Partial<Record<AnalysisType, string>> = {
  team: 'teams',
  player: 'players',
  goalie: 'goalies',
};

@Component({
  selector: 'app-analysis-modal',
  imports: [
    LowerCasePipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    ButtonSmallComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
    CustomSelectComponent,
  ],
  templateUrl: './analysis.modal.html',
  styleUrl: './analysis.modal.scss',
})
export class AnalysisModal {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private router = inject(Router);
  data = inject(ModalService).getModalData<AnalysisModalData>();

  readonly mode = this.data.mode;
  readonly isViewMode = this.mode === 'view';
  readonly isEditMode = this.mode === 'edit';
  readonly analysisType = this.data.analysisType;
  readonly entityLabel = ENTITY_LABELS[this.analysisType];

  analysisForm!: FormGroup;
  isSubmitting = signal(false);
  selectedEntityId = signal('');

  entityOptions = computed<SelectOption[]>(() => {
    if (this.analysisType === 'team' && this.data.teams) {
      return this.data.teams.map((t) => ({ value: String(t.id), label: t.name }));
    }
    if (this.analysisType === 'game' && this.data.games) {
      return this.data.games.map((g) => ({ value: g.value, label: g.label }));
    }
    return [];
  });

  entityOptionGroups = computed<SelectOptionGroup[]>(() => {
    if (this.analysisType === 'player' && this.data.players) {
      return this.groupEntities(this.data.players, (p) => p.team || 'Unknown Team', (p) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName}`,
        prefix: `#${p.jerseyNumber}`,
      }));
    }
    if (this.analysisType === 'goalie' && this.data.goalies) {
      return this.groupEntities(this.data.goalies, (g) => g.team || 'Unknown Team', (g) => ({
        value: g.id,
        label: `${g.firstName} ${g.lastName}`,
        prefix: `#${g.jerseyNumber}`,
      }));
    }
    return [];
  });

  useOptionGroups = computed(() => this.analysisType === 'player' || this.analysisType === 'goalie');

  isEntityLocked = computed(() => !!this.data.preSelectedEntityId || this.isEditMode);

  selectedEntityLabel = computed(() => {
    const entityId = this.selectedEntityId();
    if (!entityId) return '';

    if (this.analysisType === 'player' && this.data.players) {
      const player = this.data.players.find((p) => p.id === entityId);
      return player ? `${player.firstName} ${player.lastName}` : '';
    }
    if (this.analysisType === 'goalie' && this.data.goalies) {
      const goalie = this.data.goalies.find((g) => g.id === entityId);
      return goalie ? `${goalie.firstName} ${goalie.lastName}` : '';
    }
    if (this.analysisType === 'team' && this.data.teams) {
      const team = this.data.teams.find((t) => String(t.id) === entityId);
      return team ? team.name : '';
    }
    if (this.analysisType === 'game' && this.data.games) {
      const game = this.data.games.find((g) => g.value === entityId);
      return game ? game.label : '';
    }
    return '';
  });

  profileRoute = computed(() => {
    const segment = PROFILE_ROUTE_SEGMENTS[this.analysisType];
    if (!segment) return null;

    if (this.isViewMode && this.data.analysis) {
      return `/teams-and-rosters/${segment}/${this.data.analysis.entityId}/profile`;
    }

    const entityId = this.selectedEntityId();
    if (entityId) {
      return `/teams-and-rosters/${segment}/${entityId}/profile`;
    }

    return null;
  });

  private readonly fieldLabels: Record<string, string> = {
    entityId: this.entityLabel,
    title: 'Title',
    author: 'Author',
    analysis: 'Analysis',
  };

  constructor() {
    if (!this.isViewMode) {
      this.analysisForm = this.fb.group({
        entityId: ['', [Validators.required]],
        title: ['', [Validators.required]],
        author: ['', [Validators.required]],
        analysis: ['', [Validators.required]],
      });

      this.analysisForm
        .get('entityId')!
        .valueChanges.pipe(takeUntilDestroyed())
        .subscribe((value: string) => this.selectedEntityId.set(value));

      this.modalService.registerDirtyCheck(() => this.analysisForm.dirty);
      this.patchFormValues();
    }

    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.analysisForm.invalid) {
      Object.keys(this.analysisForm.controls).forEach((key) => {
        this.analysisForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.analysisForm.value;
    const apiIdField = API_ID_FIELDS[this.analysisType];
    const apiData: AnalyticsApiIn = {
      author: formValue.author,
      title: formValue.title,
      analysis: formValue.analysis,
      [apiIdField]: parseInt(formValue.entityId, 10),
    };

    const result: AnalysisModalResult = {
      isEditMode: this.isEditMode,
      analysisId: this.data.analysis?.id,
      apiData,
    };
    this.modalService.closeWithDataProcessing(result);
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  closeModals(): void {
    this.modalService.closeAll();
  }

  goToProfile(): void {
    const route = this.profileRoute();
    if (!route) return;
    this.modalService.closeAll();
    this.router.navigate([route]);
  }

  getErrorMessage(fieldName: string): string {
    return getFieldError(
      this.analysisForm.get(fieldName),
      this.fieldLabels[fieldName] || fieldName
    );
  }

  private patchFormValues(): void {
    if (this.isEditMode && this.data.analysis) {
      this.analysisForm.patchValue({
        entityId: String(this.data.analysis.entityId),
        title: this.data.analysis.title,
        author: this.data.analysis.author,
        analysis: this.data.analysis.analysis,
      });
    } else if (this.data.preSelectedEntityId) {
      this.analysisForm.patchValue({ entityId: this.data.preSelectedEntityId });
    }
  }

  private groupEntities<T>(
    items: T[],
    groupKeyFn: (item: T) => string,
    mapFn: (item: T) => SelectOption,
  ): SelectOptionGroup[] {
    const groups = new Map<string, SelectOption[]>();
    for (const item of items) {
      const key = groupKeyFn(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(mapFn(item));
    }
    return Array.from(groups, ([label, options]) => ({ label, options }));
  }
}
